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
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = forwardedHost || req.get('host');
  let protocol = forwardedProto || req.protocol || 'http';

  if (/riversoft\.top$/i.test(String(host || '').split(':')[0])) {
    protocol = 'https';
  }

  return normalizeOrigin(`${protocol}://${host}`);
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

  const publicOrigin = allowedOrigins.find((origin) => !isLocalOrigin(origin) && origin.startsWith('https://'));
  return normalizeOrigin(publicOrigin || allowedOrigins[0] || DEFAULT_CLIENT_ORIGIN);
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
  const match = String(claimedId || '').match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/i);
  return match ? match[1] : null;
}

function isSqliteUniqueConstraintError(error) {
  return error?.code === 'SQLITE_CONSTRAINT' || String(error?.message || '').includes('SQLITE_CONSTRAINT');
}

function getDatabaseSaveErrorStatus(error) {
  const message = String(error?.message || '');

  if (isSqliteUniqueConstraintError(error)) {
    return 'conflict';
  }

  if (
    message.includes('no such column') ||
    message.includes('no such table') ||
    message.includes('ON CONFLICT clause does not match')
  ) {
    return 'db_schema_outdated';
  }

  return 'db_save_failed';
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

function logSteamBindingFailure(reason, extra = {}) {
  console.warn('Steam binding failed:', { reason, ...extra });
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
    body: params.toString(),
  });

  const text = await response.text();
  const isValid = response.ok && /(^|\r?\n)is_valid\s*:\s*true\b/i.test(text);

  if (!isValid) {
    logSteamBindingFailure('steam_check_authentication_rejected', {
      status: response.status,
      responsePreview: text.slice(0, 200),
    });
  }

  return isValid;
}

async function deleteExpiredSessions() {
  await db.run('DELETE FROM sessions WHERE expires_at <= ?', [Date.now()]);
}

async function deleteExpiredPlatformAuthStates() {
  await db.run('DELETE FROM platform_auth_states WHERE expires_at <= ?', [Date.now()]);
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

async function consumePlatformAuthState(platform, state) {
  await deleteExpiredPlatformAuthStates();

  const savedState = await db.get(
    `SELECT state, user_id AS userId, session_id AS sessionId, redirect_uri AS redirectUri
     FROM platform_auth_states
     WHERE state = ? AND platform = ? AND expires_at > ?`,
    [state, platform, Date.now()]
  );

  await db.run('DELETE FROM platform_auth_states WHERE state = ?', [state]);
  return savedState;
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
  const updateResult = await db.run(
    `UPDATE platform_accounts
     SET platform_user_id = ?, account_name = ?, profile_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND platform = ?`,
    [account.platformUserId, account.accountName, account.profileUrl, userId, platform]
  );

  if (updateResult.changes && updateResult.changes > 0) {
    return;
  }

  await db.run(
    `INSERT INTO platform_accounts (user_id, platform, platform_user_id, account_name, profile_url, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, platform, account.platformUserId, account.accountName, account.profileUrl]
  );
}

async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
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
    CREATE INDEX IF NOT EXISTS idx_platform_auth_states_expires_at ON platform_auth_states(expires_at);
  `);

  await ensureUserColumns();
  await ensurePlatformAccountColumns();
  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_accounts_platform_user_id
    ON platform_accounts(platform, platform_user_id)
    WHERE platform_user_id IS NOT NULL;
  `);
  console.log('Database initialized');
}

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
    const result = await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    const sessionId = await createSession(result.lastID);
    const user = await getUserProfile(result.lastID);

    res.setHeader('Set-Cookie', buildSessionCookie(sessionId));
    res.status(201).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

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

app.get('/api/auth/steam/callback', async (req, res) => {
  const state = sanitizeOptionalString(getQueryValue(req.query, 'state'), 128);
  const errorRedirect = (status = 'error') => res.redirect(buildClientProfileRedirect(req, 'steam', status));

  if (!state) {
    logSteamBindingFailure('missing_state');
    return errorRedirect('missing_state');
  }

  try {
    const savedState = await consumePlatformAuthState('steam', state);

    if (!savedState?.userId) {
      logSteamBindingFailure('expired_or_unknown_state', { statePrefix: state.slice(0, 8) });
      return errorRedirect('expired_state');
    }

    if (getQueryValue(req.query, 'openid.mode') !== 'id_res') {
      logSteamBindingFailure('openid_mode_not_id_res', { mode: getQueryValue(req.query, 'openid.mode') });
      return errorRedirect('denied');
    }

    const isValid = await verifySteamOpenId(req.query);
    if (!isValid) {
      return errorRedirect('verify_failed');
    }

    const claimedId = getQueryValue(req.query, 'openid.claimed_id');
    const identity = getQueryValue(req.query, 'openid.identity');
    const steamId = extractSteamIdFromClaimedId(claimedId);
    const identitySteamId = extractSteamIdFromClaimedId(identity);

    if (!steamId || (identitySteamId && identitySteamId !== steamId)) {
      logSteamBindingFailure('invalid_steam_claim', { claimedId, identity });
      return errorRedirect('invalid_claim');
    }

    const profileUrl = `https://steamcommunity.com/profiles/${steamId}`;

    try {
      await upsertVerifiedPlatformAccount(savedState.userId, 'steam', {
        platformUserId: steamId,
        accountName: steamId,
        profileUrl,
      });
    } catch (error) {
      console.error('Steam binding save failed:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
      });
      return errorRedirect(getDatabaseSaveErrorStatus(error));
    }

    res.redirect(buildClientProfileRedirect(req, 'steam', 'linked'));
  } catch (error) {
    console.error(error);
    errorRedirect(isSqliteUniqueConstraintError(error) ? 'conflict' : 'error');
  }
});

app.get('/api/auth/:platform', authenticateSession, async (req, res) => {
  const platform = normalizePlatform(req.params.platform);
  res.redirect(buildClientProfileRedirect(req, platform || 'unknown', 'unsupported'));
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
