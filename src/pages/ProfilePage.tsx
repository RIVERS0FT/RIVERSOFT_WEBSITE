import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Gamepad2,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

const backgroundVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

type ToastState = {
  tone: "success" | "error";
  title: string;
  description: string;
};

const platformOptions = [
  {
    id: "steam",
    name: "Steam",
    iconUrl: "https://cdn.simpleicons.org/steam/FFFFFF",
    bindUrl: `${API_BASE_URL}/auth/steam`,
    canShowBound: true,
  },
  {
    id: "epic",
    name: "Epic Games",
    iconUrl: "https://cdn.simpleicons.org/epicgames/FFFFFF",
    bindUrl: "https://www.epicgames.com/account/connections",
    canShowBound: false,
  },
  {
    id: "ea",
    name: "EA",
    iconUrl: "https://cdn.simpleicons.org/ea/FFFFFF",
    bindUrl: "https://myaccount.ea.com/cp-ui/connectaccounts/index",
    canShowBound: false,
  },
  {
    id: "xbox",
    name: "Xbox",
    iconUrl: "https://cdn.simpleicons.org/xbox/FFFFFF",
    bindUrl: "https://account.xbox.com/Profile",
    canShowBound: false,
  },
  {
    id: "playstation",
    name: "PlayStation",
    iconUrl: "https://cdn.simpleicons.org/playstation/FFFFFF",
    bindUrl: "https://www.playstation.com/acct/",
    canShowBound: false,
  },
  {
    id: "nintendo",
    name: "Nintendo",
    iconUrl: "https://cdn.simpleicons.org/nintendoswitch/FFFFFF",
    bindUrl: "https://accounts.nintendo.com/",
    canShowBound: false,
  },
  {
    id: "riot",
    name: "Riot Games",
    iconUrl: "https://cdn.simpleicons.org/riotgames/FFFFFF",
    bindUrl: "https://account.riotgames.com/",
    canShowBound: false,
  },
  {
    id: "battlenet",
    name: "Battle.net",
    iconUrl: "https://cdn.simpleicons.org/battledotnet/FFFFFF",
    bindUrl: "https://account.battle.net/connections",
    canShowBound: false,
  },
  {
    id: "ubisoft",
    name: "Ubisoft Connect",
    iconUrl: "https://cdn.simpleicons.org/ubisoft/FFFFFF",
    bindUrl: "https://account.ubisoft.com/account-information",
    canShowBound: false,
  },
  {
    id: "discord",
    name: "Discord",
    iconUrl: "https://cdn.simpleicons.org/discord/FFFFFF",
    bindUrl: "https://discord.com/channels/@me",
    canShowBound: false,
  },
  {
    id: "twitch",
    name: "Twitch",
    iconUrl: "https://cdn.simpleicons.org/twitch/FFFFFF",
    bindUrl: "https://www.twitch.tv/settings/connections",
    canShowBound: false,
  },
] as const;

const profileCopy = {
  en: {
    title: "Player Profile",
    subtitle: "Manage your public profile, platform links, and account security.",
    backHome: "Back to Home",
    overview: "Account Overview",
    profile: "Public Profile",
    platforms: "Game Platforms",
    security: "Security",
    displayName: "Display name",
    avatar: "Avatar URL",
    bio: "Bio / status",
    location: "Location",
    website: "Website",
    memberSince: "Member since",
    saveProfile: "Save profile",
    bind: "Bind",
    unlink: "Unbind",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    updatePassword: "Update password",
    saved: "Saved successfully.",
    unlinked: "Platform unbound.",
    platformLinked: "account linked successfully.",
    platformLinkFailed: "binding failed. Please try again.",
    platformAlreadyLinked: "is already linked to another RIVERSOFT account.",
    platformUnconfigured: "binding is not configured on the server yet.",
    platformUnsupported: "binding is not supported yet.",
    bindingSuccessTitle: "Binding complete",
    bindingFailureTitle: "Binding failed",
    bindingReasons: {
      conflict: "This account is already linked to another RIVERSOFT account.",
      missing_state: "The binding request is missing its security state. Please start again from this page.",
      expired_state: "The binding session expired. Please click Bind again and finish within 10 minutes.",
      denied: "Steam did not complete authorization. Please approve the Steam sign-in request.",
      verify_failed: "Steam returned the sign-in response, but server-side verification failed.",
      invalid_claim: "Steam returned an invalid account claim. Please try again.",
      db_schema_outdated: "The server database schema is outdated. Pull the latest code and restart the backend so migrations run.",
      db_save_failed: "The server could not save the Steam binding. Check backend logs for 'Steam binding save failed'.",
      unexpected_callback_error: "The Steam callback hit an unexpected server error. Check backend logs for 'Steam binding callback failed'.",
      unconfigured: "This platform is not configured on the server yet.",
      unsupported: "This platform does not support RIVERSOFT binding yet.",
      error: "The server hit an unexpected error while saving the binding.",
      fallback: "Binding failed or expired. Please try again.",
    },
    passwordSaved: "Password updated. Other sessions have been signed out.",
    passwordMismatch: "New passwords do not match.",
    fallbackError: "Something went wrong.",
    emailVerified: "Email login enabled",
    sessionProtected: "HttpOnly session cookie",
    privacyNote: "Steam can be linked to RIVERSOFT. Other platform buttons open the official account page.",
  },
  zh: {
    title: "玩家资料",
    subtitle: "管理公开资料、平台入口与账号安全。",
    backHome: "返回首页",
    overview: "账号概览",
    profile: "公开资料",
    platforms: "游戏平台",
    security: "账号安全",
    displayName: "用户名 / 显示名称",
    avatar: "头像 URL",
    bio: "个人简介 / 状态",
    location: "地区",
    website: "个人网站",
    memberSince: "注册时间",
    saveProfile: "保存资料",
    bind: "绑定",
    unlink: "解绑",
    currentPassword: "当前密码",
    newPassword: "新密码",
    confirmPassword: "确认新密码",
    updatePassword: "修改密码",
    saved: "保存成功。",
    unlinked: "平台已解绑。",
    platformLinked: "账号绑定成功。",
    platformLinkFailed: "绑定失败，请重试。",
    platformAlreadyLinked: "已绑定到另一个 RIVERSOFT 账号。",
    platformUnconfigured: "服务端尚未配置该平台绑定参数。",
    platformUnsupported: "暂未支持本站绑定。",
    bindingSuccessTitle: "绑定完成",
    bindingFailureTitle: "绑定失败",
    bindingReasons: {
      conflict: "该账号已绑定到另一个 RIVERSOFT 账号。",
      missing_state: "绑定请求缺少安全状态，请从当前页面重新点击绑定。",
      expired_state: "绑定会话已过期，请重新点击绑定，并在 10 分钟内完成。",
      denied: "Steam 未完成授权，请在 Steam 登录页确认授权。",
      verify_failed: "Steam 已返回登录结果，但服务器校验未通过。",
      invalid_claim: "Steam 返回的账号声明无效，请重试。",
      db_schema_outdated: "服务器数据库结构过旧，请拉取最新代码并重启后端，让迁移自动执行。",
      db_save_failed: "服务器无法保存 Steam 绑定，请查看后端日志里的 Steam binding save failed。",
      unexpected_callback_error: "Steam 回调发生未知服务端错误，请查看后端日志里的 Steam binding callback failed。",
      unconfigured: "服务端尚未配置该平台绑定参数。",
      unsupported: "该平台暂未支持 RIVERSOFT 绑定。",
      error: "服务器保存绑定时发生异常。",
      fallback: "绑定失败或已过期，请重试。",
    },
    passwordSaved: "密码已更新，其他会话已退出。",
    passwordMismatch: "两次输入的新密码不一致。",
    fallbackError: "操作失败，请稍后重试。",
    emailVerified: "邮箱登录已启用",
    sessionProtected: "HttpOnly 会话 Cookie",
    privacyNote: "Steam 可绑定到 RIVERSOFT，其他平台按钮会打开官方账号页面。",
  },
} as const;

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function getPlatformName(platformId: string) {
  return platformOptions.find((platform) => platform.id === platformId)?.name || platformId;
}

function PlatformIcon({ src, name }: { src: string; name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
      <img src={src} alt={`${name} logo`} className="h-5 w-5 object-contain" loading="lazy" />
    </span>
  );
}

export function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = profileCopy[language];

  const [profileForm, setProfileForm] = useState({
    name: "",
    avatar: "",
    bio: "",
    location: "",
    website: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [updatingPlatform, setUpdatingPlatform] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    document.title = `${t.title} | RIVERSOFT`;
  }, [t.title]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const legacySteamStatus = params.get("steam");
    const platformId = params.get("platform") || (legacySteamStatus ? "steam" : "");
    const status = params.get("status") || legacySteamStatus;

    if (!platformId || !status) return;

    params.delete("platform");
    params.delete("status");
    params.delete("steam");
    const nextSearch = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
    );

    const platformName = getPlatformName(platformId);

    if (status === "linked") {
      setError("");
      setMessage("");
      setToast({
        tone: "success",
        title: `${platformName} ${t.bindingSuccessTitle}`,
        description: `${platformName} ${t.platformLinked}`,
      });
      refreshUser().catch((err) => {
        console.error("Failed to refresh user after platform binding:", err);
      });
      return;
    }

    const knownReason = t.bindingReasons[status as keyof typeof t.bindingReasons];
    const reason = knownReason || `${t.bindingReasons.fallback} (${status})`;
    setMessage("");
    setError("");
    setToast({
      tone: "error",
      title: `${platformName} ${t.bindingFailureTitle}`,
      description: reason,
    });
  }, [refreshUser, t]);

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      name: user.name || "",
      avatar: user.avatar || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
    });
  }, [user]);

  const parseError = async (res: Response) => {
    const data = await res.json().catch(() => ({ message: t.fallbackError }));
    return data.message || t.fallbackError;
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);

    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileForm),
      });

      if (!res.ok) throw new Error(await parseError(res));
      await refreshUser();
      setMessage(t.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch(`${API_BASE_URL}/profile/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) throw new Error(await parseError(res));
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage(t.passwordSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUnlinkPlatform = async (platformId: string) => {
    setError("");
    setMessage("");
    setUpdatingPlatform(platformId);

    try {
      const res = await fetch(`${API_BASE_URL}/profile/platforms/${platformId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await parseError(res));
      await refreshUser();
      setMessage(t.unlinked);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError);
    } finally {
      setUpdatingPlatform(null);
    }
  };

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin" size={28} />
      </main>
    );
  }

  const displayName = user.name || user.email.split("@")[0];
  const linkedPlatforms = new Map(
    (user.platforms || [])
      .filter((platform) =>
        Boolean(platform.platform && (platform.platformUserId || platform.accountName || platform.profileUrl))
      )
      .map((platform) => [String(platform.platform).toLowerCase(), platform])
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-black font-body text-white">
      <video
        className="fixed inset-0 z-0 h-full w-full object-cover"
        src={backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[1] bg-black/55 backdrop-blur-sm" aria-hidden="true" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="liquid-glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-white/80 transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={16} />
            {t.backHome}
          </Link>
          <div className="liquid-glass flex h-11 items-center gap-2 rounded-full px-4 text-sm text-white/70">
            <ShieldCheck size={16} />
            RIVERSOFT ID
          </div>
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[0.9fr_1.6fr]">
          <aside className="liquid-glass-strong rounded-[2rem] p-6 lg:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/20 bg-white/10">
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserIcon size={38} className="text-white/70" />
                  </div>
                )}
              </div>
              <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.05em] text-white">
                {displayName}
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">{t.subtitle}</p>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-white/70">
              <div className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3">
                <Mail size={16} className="text-white/50" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3">
                <Gamepad2 size={16} className="text-white/50" />
                <span>{platformOptions.length} {t.platforms}</span>
              </div>
              <div className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3">
                <BadgeCheck size={16} className="text-white/50" />
                <span>{t.emailVerified}</span>
              </div>
              <div className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3">
                <LockKeyhole size={16} className="text-white/50" />
                <span>{t.sessionProtected}</span>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="font-body text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                {t.overview}
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/65">
                <p>ID #{user.id}</p>
                <p>{t.memberSince}: {formatDate(user.createdAt)}</p>
                {user.location ? <p className="flex items-center gap-2"><MapPin size={14} />{user.location}</p> : null}
                {user.website ? (
                  <a href={user.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white hover:text-white/80">
                    <Globe2 size={14} />{user.website}<ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {(message || error) ? (
              <div className={`rounded-3xl border px-5 py-4 text-sm ${error ? "border-red-400/30 bg-red-500/15 text-red-100" : "border-white/15 bg-white/10 text-white/80"}`}>
                {error || message}
              </div>
            ) : null}

            <form onSubmit={handleProfileSubmit} className="liquid-glass-strong rounded-[2rem] p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <UserIcon size={20} />
                <h2 className="font-display text-2xl font-medium tracking-[-0.04em]">{t.profile}</h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  <span>{t.displayName}</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) => setProfileForm((form) => ({ ...form, name: event.target.value }))}
                    className="liquid-glass w-full rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                    maxLength={64}
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  <span>{t.avatar}</span>
                  <input
                    value={profileForm.avatar}
                    onChange={(event) => setProfileForm((form) => ({ ...form, avatar: event.target.value }))}
                    className="liquid-glass w-full rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                    placeholder="https://..."
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70 lg:col-span-2">
                  <span>{t.bio}</span>
                  <textarea
                    value={profileForm.bio}
                    onChange={(event) => setProfileForm((form) => ({ ...form, bio: event.target.value }))}
                    className="liquid-glass min-h-28 w-full resize-none rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                    maxLength={500}
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  <span>{t.location}</span>
                  <input
                    value={profileForm.location}
                    onChange={(event) => setProfileForm((form) => ({ ...form, location: event.target.value }))}
                    className="liquid-glass w-full rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                    maxLength={80}
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  <span>{t.website}</span>
                  <input
                    value={profileForm.website}
                    onChange={(event) => setProfileForm((form) => ({ ...form, website: event.target.value }))}
                    className="liquid-glass w-full rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                    placeholder="https://..."
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-display text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
              >
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t.saveProfile}
              </button>
            </form>

            <section className="liquid-glass-strong rounded-[2rem] p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <Gamepad2 size={20} />
                <h2 className="font-display text-2xl font-medium tracking-[-0.04em]">{t.platforms}</h2>
              </div>
              <p className="mb-5 text-sm text-white/55">{t.privacyNote}</p>

              <div className="grid gap-4 xl:grid-cols-2">
                {platformOptions.map((platform) => {
                  const linkedPlatform = linkedPlatforms.get(platform.id);
                  const isLinked = Boolean(
                    linkedPlatform?.platformUserId || linkedPlatform?.accountName || linkedPlatform?.profileUrl
                  );
                  const isUpdating = updatingPlatform === platform.id;

                  return (
                    <article key={platform.id} className="liquid-glass rounded-3xl px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <PlatformIcon src={platform.iconUrl} name={platform.name} />
                          <h3 className="truncate font-display text-base font-medium text-white">{platform.name}</h3>
                        </div>

                        {isLinked ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUnlinkPlatform(platform.id)}
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
                          >
                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                            {t.unlink}
                          </button>
                        ) : (
                          <a
                            href={platform.bindUrl}
                            target={platform.canShowBound ? undefined : "_blank"}
                            rel={platform.canShowBound ? undefined : "noreferrer"}
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <ExternalLink size={14} />
                            {t.bind}
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <form onSubmit={handlePasswordSubmit} className="liquid-glass-strong rounded-[2rem] p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <KeyRound size={20} />
                <h2 className="font-display text-2xl font-medium tracking-[-0.04em]">{t.security}</h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((form) => ({ ...form, currentPassword: event.target.value }))}
                  className="liquid-glass rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                  placeholder={t.currentPassword}
                />
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((form) => ({ ...form, newPassword: event.target.value }))}
                  className="liquid-glass rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                  placeholder={t.newPassword}
                />
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((form) => ({ ...form, confirmPassword: event.target.value }))}
                  className="liquid-glass rounded-2xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/25"
                  placeholder={t.confirmPassword}
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-display text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
              >
                {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                {t.updatePassword}
              </button>
            </form>
          </div>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 w-[min(calc(100vw-2rem),24rem)] animate-[fadeIn_0.2s_ease-out]">
          <div
            className={`rounded-3xl border px-5 py-4 shadow-2xl backdrop-blur-2xl ${
              toast.tone === "error"
                ? "border-red-400/30 bg-red-500/20 text-red-50"
                : "border-emerald-300/25 bg-emerald-500/15 text-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-sm font-semibold tracking-[-0.02em]">{toast.title}</p>
                <p className="mt-1 text-sm leading-5 text-white/75">{toast.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="shrink-0 rounded-full px-2 text-lg leading-none text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
