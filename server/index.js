import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'database.sqlite');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'riversoft_sid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const PLATFORM_AUTH_STATE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const STEAM_OPENID_IDENTIFIER = 'http://specs.openid.net/auth/2.0/identifier_select';
const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://riversoft.top,https://riversoft.top,http://www.riversoft.top,https://www.riversoft.top')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const supportedPlatforms = new Set([
  'steam',
  'epic',
  'ea',
  'xbox',
  'playstation',
  'nintendo',
  'riot',
  'battlenet',
  'ubisoft',
  'discord',
  'twitch',
]);

const oauthProviders = {
  discord: {
    platform: 'discord',
    displayName: 'Discord',
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scope: 'identify',
    async fetchAccount(accessToken) {
      const profile = await fetchJson('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }, 'Failed to fetch Discord profile');

      if (!profile.id) {
        throw new Error('Discord profile response is missing id');
      }

      return {
        platformUserId: String(profile.id),
        accountName: String(profile.global_name || profile.username || profile.id).slice(0, 80),
        profileUrl: `https://discord.com/users/${profile.id}`,
      };
    },
  },
  twitch: {
    platform: 'twitch',
    displayName: 'Twitch',
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    authorizeUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    scope: '',
    async fetchAccount(accessToken, provider) {
      const response = await fetchJson('https://api.twitch.tv/helix/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': provider.clientId,
        },
      }, 'Failed to fetch Twitch profile');
      const profile = Array.isArray(response.data) ? response.data[0] : null;

      if (!profile?.id) {
        throw new Error('Twitch profile response is missing id');
      }

      return {
        platformUserId: String(profile.id),
        accountName: String(profile.display_name || profile.login || profile.id).slice(0, 80),
        profileUrl: profile.login ? `https://www.twitch.tv/${profile.login}` : null,
      };
    },
  },
};

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

let db;

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((cookies, item) => {
    const [rawName, ...rawValue] = item.trim().split('=');
    if (!rawName) return cookies;

    try {
      cookies[rawName] = decodeURIComponent(rawValue.join('='));
    } catch {
      cookies[rawName] = rawValue.join('=');
    }

    return cookies;
  }, {});
}

function buildSessionCookie(sessionId, maxAgeSeconds = SESSION_TTL_MS / 1000) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];

  if (COOKIE_SECURE) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildClearSessionCookie() {
  return buildSessionCookie('', 0);
}

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function getRequestOrigin(req) {
  return normalizeOrigin(`${req.protocol}://${req.get('host')}`);
}

function getServerOrigin(req) {
  return normalizeOrigin(process.env.SERVER_PUBLIC_ORIGIN || getRequestOrigin(req));
}

function getClientOrigin(req) {
  if (process.env.CLIENT_PUBLIC_ORIGIN) {
    return normalizeOrigin(process.env.CLIENT_PUBLIC_ORIGIN);
  }

  const requestOrigin = getRequestOrigin(req);
  if (!isLocalOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return normalizeOrigin(allowedOrigins[0] || DEFAULT_CLIENT_ORIGIN);
}

function buildClientProfileRedirect(req, platform, status) {
  const profileUrl = process.env.CLIENT_PROFILE_URL || `${getClientOrigin(req)}/profile`;
  const url = new URL(profileUrl);
  url.searchParams.set('platform', platform);
  url.searchParams.set('status', status);
  return url.toString();
}

function getQueryValue(query, key) {
  const value = query[key];
  if (Array.isArray(value)) return value[0];
  if (value === undefined || value === null) return '';
  return String(value);
}

function extractSteamIdFromClaimedId(claimedId) {
  const match = String(claimedId || '').match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  return match ? match[1] : null;
}

function isOAuthProviderConfigured(provider) {
  return Boolean(provider?.clientId && provider?.clientSecret);
}

function isSqliteUniqueConstraintError(error) {
  return error?.code === 'SQLITE_CONSTRAINT' || String(error?.message || '').includes('SQLITE_CONSTRAINT');
}

async function fetchJson(url, options, errorMessage) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(`${errorMessage}: HTTP ${response.status}`);
  }

  return data;
}

async function verifySteamOpenId(query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('openid.')) continue;
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (normalizedValue !== undefined && normalizedValue !== null) {
      params.set(key, String(normalizedValue));
    }
  }

  params.set('openid.mode', 'check_authentication');

  const response = await fetch(STEAM_OPENID_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const text = await response.text();
  return response.ok && /(^|\n)is_valid\s*:\s*true(\r?\n|$)/.test(text);
}

async function exchangeOAuthCode(provider, code, redirectUri) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
  });

  const token = await fetchJson(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  }, `Failed to exchange ${provider.displayName} OAuth code`);

  if (!token?.access_token) {
    throw new Error(`${provider.displayName} token response is missing access token`);
  }

  return token;
}

async function deleteExpiredSessions() {
  await db.run('DELETE FROM sessions WHERE expires_at <= ?', [Date.now()]);
}

async function deleteExpiredPlatformAuthStates() {
  await db.run('DELETE FROM platform_auth_states WHERE expires_at <= ?', [Date.now()]);
}

async function createPlatformAuthState(platform, req, redirectUri) {
  await deleteExpiredPlatformAuthStates();

  const state = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + PLATFORM_AUTH_STATE_TTL_MS;

  await db.run(
    'INSERT INTO platform_auth_states (state, user_id, session_id, platform, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [state, req.user.id, req.sessionId, platform, redirectUri, expiresAt]
  );

  return state;
}

async function consumePlatformAuthState(platform, state, req) {
  await deleteExpiredPlatformAuthStates();

  const savedState = await db.get(
    `SELECT state, redirect_uri AS redirectUri
     FROM platform_auth_states
     WHERE state = ? AND platform = ? AND user_id = ? AND session_id = ? AND expires_at > ?`,
    [state, platform, req.user.id, req.sessionId, Date.now()]
  );

  await db.run('DELETE FROM platform_auth_states WHERE state = ?', [state]);
  return savedState;
}

async function createSession(userId) {
  await deleteExpiredSessions();

  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;

  await db.run(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    [sessionId, userId, expiresAt]
  );

  return sessionId;
}

async function ensureUserColumns() {
  const columns = await db.all('PRAGMA table_info(users)');
  const columnNames = new Set(columns.map((column) => column.name));
  const missingColumns = [
    ['avatar', 'TEXT'],
    ['bio', 'TEXT'],
    ['location', 'TEXT'],
    ['website', 'TEXT'],
  ].filter(([name]) => !columnNames.has(name));

  for (const [name, type] of missingColumns) {
    await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
  }
}

async function ensurePlatformAccountColumns() {
  const columns = await db.all('PRAGMA table_info(platform_accounts)');
  const columnNames = new Set(columns.map((column) => column.name));
  const missingColumns = [
    ['platform_user_id', 'TEXT'],
  ].filter(([name]) => !columnNames.has(name));

  for (const [name, type] of missingColumns) {
    await db.exec(`ALTER TABLE platform_accounts ADD COLUMN ${name} ${type}`);
  }

  await db.run(
    `UPDATE platform_accounts
     SET platform_user_id = account_name
     WHERE platform = 'steam' AND platform_user_id IS NULL AND account_name IS NOT NULL`
  );
}

function sanitizeOptionalString(value, maxLength = 200) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizePlatform(value) {
  return String(value || '').trim().toLowerCase();
}

async function getUserProfile(userId) {
  const user = await db.get(
    'SELECT id, email, name, avatar, bio, location, website, created_at AS createdAt FROM users WHERE id = ?',
    [userId]
  );

  if (!user) return null;

  const platforms = await db.all(
    `SELECT platform, platform_user_id AS platformUserId, account_name AS accountName, profile_url AS profileUrl, updated_at AS updatedAt
     FROM platform_accounts
     WHERE user_id = ?
     ORDER BY platform ASC`,
    [userId]
  );

  return { ...user, platforms };
}

async function upsertVerifiedPlatformAccount(userId, platform, account) {
  await db.run(
    `INSERT INTO platform_accounts (user_id, platform, platform_user_id, account_name, profile_url, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, platform)
     DO UPDATE SET platform_user_id = excluded.platform_user_id,
                   account_name = excluded.account_name,
                   profile_url = excluded.profile_url,
                   updated_at = CURRENT_TIMESTAMP`,
    [userId, platform, account.platformUserId, account.accountName, account.profileUrl]
  );
}

// Initialize database
async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      avatar TEXT,
      bio TEXT,
      location TEXT,
      website TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platform_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      platform_user_id TEXT,
      account_name TEXT NOT NULL,
      profile_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, platform),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platform_auth_states (
      state TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      redirect_uri TEXT,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_platform_accounts_user_id ON platform_accounts(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_accounts_platform_user_id ON platform_accounts(platform, platform_user_id) WHERE platform_user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_platform_auth_states_expires_at ON platform_auth_states(expires_at);
  `);

  await ensureUserColumns();
  await ensurePlatformAccountColumns();
  console.log('Database initialized');
}

// Middleware to verify session cookie
const authenticateSession = async (req, res, next) => {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE_NAME];

  if (!sessionId) {
    return res.sendStatus(401);
  }

  try {
    await deleteExpiredSessions();

    const session = await db.get(
      `SELECT sessions.id, users.id AS user_id, users.email, users.name, users.avatar
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ? AND sessions.expires_at > ?`,
      [sessionId, Date.now()]
    );

    if (!session) {
      res.setHeader('Set-Cookie', buildClearSessionCookie());
      return res.sendStatus(401);
    }

    req.sessionId = session.id;
    req.user = {
      id: session.user_id,
      email: session.email,
      name: session.name,
      avatar: session.avatar,
    };
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error verifying session' });
  }
};

// API: Register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );

    const sessionId = await createSession(result.lastID);
    const user = await getUserProfile(result.lastID);

    res.setHeader('Set-Cookie', buildSessionCookie(sessionId));
    res.status(201).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// API: Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const sessionId = await createSession(user.id);
    const userPayload = await getUserProfile(user.id);

    res.setHeader('Set-Cookie', buildSessionCookie(sessionId));
    res.json({ user: userPayload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// API: Logout
app.post('/api/logout', async (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE_NAME];

  try {
    if (sessionId) {
      await db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
    }

    res.setHeader('Set-Cookie', buildClearSessionCookie());
    res.json({ message: 'Logged out' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// API: Get Current User
app.get('/api/me', authenticateSession, async (req, res) => {
  const user = await getUserProfile(req.user.id);
  res.json({ user });
});

app.get('/api/profile', authenticateSession, async (req, res) => {
  const user = await getUserProfile(req.user.id);
  res.json({ user });
});

app.patch('/api/profile', authenticateSession, async (req, res) => {
  const name = sanitizeOptionalString(req.body.name, 64);
  const avatar = sanitizeOptionalString(req.body.avatar, 1000);
  const bio = sanitizeOptionalString(req.body.bio, 500);
  const location = sanitizeOptionalString(req.body.location, 80);
  const website = sanitizeOptionalString(req.body.website, 300);

  try {
    await db.run(
      `UPDATE users
       SET name = ?, avatar = ?, bio = ?, location = ?, website = ?
       WHERE id = ?`,
      [name, avatar, bio, location, website, req.user.id]
    );

    const user = await getUserProfile(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

app.put('/api/profile/password', authenticateSession, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  try {
    const user = await db.get('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
    const isValid = user && await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    await db.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', [req.user.id, req.sessionId]);

    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating password' });
  }
});

app.get('/api/auth/steam', authenticateSession, async (req, res) => {
  try {
    const serverOrigin = getServerOrigin(req);
    const callbackUrl = `${serverOrigin}/api/auth/steam/callback`;
    const state = await createPlatformAuthState('steam', req, callbackUrl);
    const returnTo = `${callbackUrl}?state=${encodeURIComponent(state)}`;
    const realm = `${serverOrigin}/`;

    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': realm,
      'openid.identity': STEAM_OPENID_IDENTIFIER,
      'openid.claimed_id': STEAM_OPENID_IDENTIFIER,
    });

    res.redirect(`${STEAM_OPENID_ENDPOINT}?${params.toString()}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error starting Steam binding' });
  }
});

app.get('/api/auth/steam/callback', authenticateSession, async (req, res) => {
  const state = sanitizeOptionalString(getQueryValue(req.query, 'state'), 128);
  const errorRedirect = (status = 'error') => res.redirect(buildClientProfileRedirect(req, 'steam', status));

  if (!state) {
    return errorRedirect();
  }

  try {
    const savedState = await consumePlatformAuthState('steam', state, req);

    if (!savedState) {
      return errorRedirect();
    }

    if (getQueryValue(req.query, 'openid.mode') !== 'id_res') {
      return errorRedirect();
    }

    const isValid = await verifySteamOpenId(req.query);
    if (!isValid) {
      return errorRedirect();
    }

    const claimedId = getQueryValue(req.query, 'openid.claimed_id');
    const identity = getQueryValue(req.query, 'openid.identity');
    const steamId = extractSteamIdFromClaimedId(claimedId);

    if (!steamId || identity !== claimedId) {
      return errorRedirect();
    }

    const profileUrl = `https://steamcommunity.com/profiles/${steamId}`;

    await upsertVerifiedPlatformAccount(req.user.id, 'steam', {
      platformUserId: steamId,
      accountName: steamId,
      profileUrl,
    });

    res.redirect(buildClientProfileRedirect(req, 'steam', 'linked'));
  } catch (error) {
    console.error(error);
    errorRedirect(isSqliteUniqueConstraintError(error) ? 'conflict' : 'error');
  }
});

app.get('/api/auth/:platform', authenticateSession, async (req, res) => {
  const platform = normalizePlatform(req.params.platform);
  const provider = oauthProviders[platform];

  if (!provider) {
    return res.redirect(buildClientProfileRedirect(req, platform || 'unknown', 'unsupported'));
  }

  if (!isOAuthProviderConfigured(provider)) {
    return res.redirect(buildClientProfileRedirect(req, platform, 'unconfigured'));
  }

  try {
    const redirectUri = `${getServerOrigin(req)}/api/auth/${platform}/callback`;
    const state = await createPlatformAuthState(platform, req, redirectUri);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      state,
    });

    if (provider.scope) {
      params.set('scope', provider.scope);
    }

    res.redirect(`${provider.authorizeUrl}?${params.toString()}`);
  } catch (error) {
    console.error(error);
    res.redirect(buildClientProfileRedirect(req, platform, 'error'));
  }
});

app.get('/api/auth/:platform/callback', authenticateSession, async (req, res) => {
  const platform = normalizePlatform(req.params.platform);
  const provider = oauthProviders[platform];
  const state = sanitizeOptionalString(getQueryValue(req.query, 'state'), 128);
  const code = sanitizeOptionalString(getQueryValue(req.query, 'code'), 2048);
  const errorRedirect = (status = 'error') => res.redirect(buildClientProfileRedirect(req, platform || 'unknown', status));

  if (!provider) {
    return errorRedirect('unsupported');
  }

  if (!isOAuthProviderConfigured(provider)) {
    return errorRedirect('unconfigured');
  }

  if (!state || !code) {
    return errorRedirect();
  }

  try {
    const savedState = await consumePlatformAuthState(platform, state, req);

    if (!savedState?.redirectUri) {
      return errorRedirect();
    }

    const token = await exchangeOAuthCode(provider, code, savedState.redirectUri);
    const account = await provider.fetchAccount(token.access_token, provider);

    await upsertVerifiedPlatformAccount(req.user.id, platform, account);

    res.redirect(buildClientProfileRedirect(req, platform, 'linked'));
  } catch (error) {
    console.error(error);
    errorRedirect(isSqliteUniqueConstraintError(error) ? 'conflict' : 'error');
  }
});

app.delete('/api/profile/platforms/:platform', authenticateSession, async (req, res) => {
  const platform = normalizePlatform(req.params.platform);

  if (!supportedPlatforms.has(platform)) {
    return res.status(400).json({ message: 'Unsupported platform' });
  }

  try {
    await db.run('DELETE FROM platform_accounts WHERE user_id = ? AND platform = ?', [req.user.id, platform]);
    const user = await getUserProfile(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error unlinking platform account' });
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}).catch(console.error);
