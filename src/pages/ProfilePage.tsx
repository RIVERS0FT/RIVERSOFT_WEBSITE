import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type UserPlatform } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Gamepad2,
  Globe2,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";

const backgroundVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const platformOptions = [
  { id: "steam", name: "Steam", hint: "Steam profile name or Steam ID" },
  { id: "epic", name: "Epic Games", hint: "Epic display name" },
  { id: "ea", name: "EA", hint: "EA ID" },
  { id: "xbox", name: "Xbox", hint: "Xbox gamertag" },
  { id: "playstation", name: "PlayStation", hint: "PSN online ID" },
  { id: "nintendo", name: "Nintendo", hint: "Nintendo nickname" },
  { id: "riot", name: "Riot Games", hint: "Riot ID, e.g. name#tag" },
  { id: "battlenet", name: "Battle.net", hint: "BattleTag, e.g. name#1234" },
  { id: "ubisoft", name: "Ubisoft Connect", hint: "Ubisoft username" },
  { id: "discord", name: "Discord", hint: "Discord username" },
  { id: "twitch", name: "Twitch", hint: "Twitch channel name" },
] as const;

const profileCopy = {
  en: {
    title: "Player Profile",
    subtitle: "Manage your public profile, linked game accounts, and account security.",
    backHome: "Back to Home",
    overview: "Account Overview",
    profile: "Public Profile",
    platforms: "Connected Platforms",
    security: "Security",
    preferences: "Preferences",
    displayName: "Display name",
    avatar: "Avatar URL",
    bio: "Bio / status",
    location: "Location",
    website: "Website",
    email: "Email",
    memberSince: "Member since",
    saveProfile: "Save profile",
    accountName: "Account name",
    profileUrl: "Profile URL",
    save: "Save",
    unlink: "Unlink",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    updatePassword: "Update password",
    saved: "Saved successfully.",
    passwordSaved: "Password updated. Other sessions have been signed out.",
    passwordMismatch: "New passwords do not match.",
    fallbackError: "Something went wrong.",
    emailVerified: "Email login enabled",
    sessionProtected: "HttpOnly session cookie",
    privacyNote: "Platform links are stored in your Riversoft profile and can be edited or removed at any time.",
    notLinked: "Not linked",
  },
  zh: {
    title: "玩家资料",
    subtitle: "管理公开资料、游戏平台绑定与账号安全。",
    backHome: "返回首页",
    overview: "账号概览",
    profile: "公开资料",
    platforms: "游戏平台绑定",
    security: "账号安全",
    preferences: "偏好设置",
    displayName: "用户名 / 显示名称",
    avatar: "头像 URL",
    bio: "个人简介 / 状态",
    location: "地区",
    website: "个人网站",
    email: "邮箱",
    memberSince: "注册时间",
    saveProfile: "保存资料",
    accountName: "平台账号名",
    profileUrl: "主页链接",
    save: "保存",
    unlink: "解绑",
    currentPassword: "当前密码",
    newPassword: "新密码",
    confirmPassword: "确认新密码",
    updatePassword: "修改密码",
    saved: "保存成功。",
    passwordSaved: "密码已更新，其他会话已退出。",
    passwordMismatch: "两次输入的新密码不一致。",
    fallbackError: "操作失败，请稍后重试。",
    emailVerified: "邮箱登录已启用",
    sessionProtected: "HttpOnly 会话 Cookie",
    privacyNote: "游戏平台账号会保存到你的 Riversoft 资料中，可随时编辑或解绑。",
    notLinked: "未绑定",
  },
} as const;

type PlatformDraft = Record<string, { accountName: string; profileUrl: string }>;

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function getPlatform(platforms: UserPlatform[] | undefined, id: string) {
  return platforms?.find((platform) => platform.platform === id);
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
  const [platformDrafts, setPlatformDrafts] = useState<PlatformDraft>({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const linkedCount = useMemo(
    () => platformOptions.filter((platform) => getPlatform(user?.platforms, platform.id)).length,
    [user?.platforms]
  );

  useEffect(() => {
    document.title = `${t.title} | RIVERSOFT`;
  }, [t.title]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      name: user.name || "",
      avatar: user.avatar || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
    });

    const drafts: PlatformDraft = {};
    platformOptions.forEach((platform) => {
      const linked = getPlatform(user.platforms, platform.id);
      drafts[platform.id] = {
        accountName: linked?.accountName || "",
        profileUrl: linked?.profileUrl || "",
      };
    });
    setPlatformDrafts(drafts);
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

  const handlePlatformSave = async (platformId: string) => {
    setError("");
    setMessage("");
    setActivePlatform(platformId);

    try {
      const draft = platformDrafts[platformId] || { accountName: "", profileUrl: "" };
      const res = await fetch(`${API_BASE_URL}/profile/platforms/${platformId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });

      if (!res.ok) throw new Error(await parseError(res));
      await refreshUser();
      setMessage(t.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError);
    } finally {
      setActivePlatform(null);
    }
  };

  const handlePlatformDelete = async (platformId: string) => {
    setError("");
    setMessage("");
    setActivePlatform(platformId);

    try {
      const res = await fetch(`${API_BASE_URL}/profile/platforms/${platformId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await parseError(res));
      await refreshUser();
      setMessage(t.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError);
    } finally {
      setActivePlatform(null);
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

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin" size={28} />
      </main>
    );
  }

  const displayName = user.name || user.email.split("@")[0];

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
                <span>{linkedCount}/{platformOptions.length} {t.platforms}</span>
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
                  const linked = getPlatform(user.platforms, platform.id);
                  const draft = platformDrafts[platform.id] || { accountName: "", profileUrl: "" };
                  const isSaving = activePlatform === platform.id;

                  return (
                    <article key={platform.id} className="liquid-glass rounded-3xl p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                            <Gamepad2 size={17} />
                          </span>
                          <div>
                            <h3 className="font-display text-base font-medium text-white">{platform.name}</h3>
                            <p className="text-xs text-white/45">{linked ? linked.accountName : t.notLinked}</p>
                          </div>
                        </div>
                        {linked ? <BadgeCheck size={17} className="text-white/70" /> : null}
                      </div>

                      <div className="space-y-3">
                        <input
                          value={draft.accountName}
                          onChange={(event) => setPlatformDrafts((drafts) => ({
                            ...drafts,
                            [platform.id]: { ...draft, accountName: event.target.value },
                          }))}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
                          placeholder={platform.hint}
                        />
                        <input
                          value={draft.profileUrl}
                          onChange={(event) => setPlatformDrafts((drafts) => ({
                            ...drafts,
                            [platform.id]: { ...draft, profileUrl: event.target.value },
                          }))}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
                          placeholder={t.profileUrl}
                        />
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handlePlatformSave(platform.id)}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                          {t.save}
                        </button>
                        {linked ? (
                          <button
                            type="button"
                            onClick={() => handlePlatformDelete(platform.id)}
                            disabled={isSaving}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-70"
                          >
                            <Trash2 size={14} />
                            {t.unlink}
                          </button>
                        ) : null}
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
    </main>
  );
}
