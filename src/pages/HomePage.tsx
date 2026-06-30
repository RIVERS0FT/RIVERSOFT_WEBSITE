import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRight,
  BookOpen,
  Download,
  Instagram,
  Linkedin,
  Menu,
  Sparkles,
  Twitter,
  Wand2,
  type LucideIcon,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import heroFlowers from "../assets/hero-flowers.png";

const backgroundVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4";

const socialLinks = [
  { label: "Twitter", icon: Twitter },
  { label: "LinkedIn", icon: Linkedin },
  { label: "Instagram", icon: Instagram },
];

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-white/10"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src="/1000002880.png"
        alt=""
        className="h-full w-full rounded-full object-cover"
      />
    </span>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
      {children}
    </span>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <article className="liquid-glass glass-card p-5 text-white/80">
      <IconBubble>
        <Icon size={16} strokeWidth={1.7} />
      </IconBubble>
      <h3 className="mt-5 font-display text-lg font-medium tracking-[-0.03em] text-white">
        {title}
      </h3>
      <p className="mt-2 max-w-[13rem] font-body text-xs leading-5 text-white/60">
        {copy}
      </p>
    </article>
  );
}

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="relative min-h-screen overflow-hidden bg-black font-body text-white">
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src={backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 z-[1] bg-black/20" aria-hidden="true" />

      <section className="relative z-10 flex min-h-screen w-full flex-row">
        <div className="relative flex min-h-screen w-full flex-col p-4 lg:w-[52%] lg:p-6">
          <div className="liquid-glass-strong absolute inset-4 rounded-3xl lg:inset-6" />

          <div className="relative z-10 flex min-h-[calc(100vh-2rem)] flex-col px-5 py-5 lg:min-h-[calc(100vh-3rem)] lg:px-8 lg:py-7">
            <nav className="flex items-center justify-between">
              <Link
                to="/"
                className="group flex items-center gap-3 transition-transform hover:scale-105"
                aria-label="RIVERSOFT home"
              >
                <LogoMark size={32} />
                <span className="font-display text-2xl font-semibold tracking-tighter text-white">
                  RIVERSOFT
                </span>
              </Link>

              <button className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm text-white/80 transition-transform hover:scale-105 active:scale-95">
                <Menu size={17} strokeWidth={1.8} />
                Menu
              </button>
            </nav>

            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center lg:py-10">
              <LogoMark size={80} />

              <h1 className="mt-8 max-w-4xl font-display text-6xl font-medium leading-[0.9] tracking-[-0.05em] text-white lg:text-7xl">
                Creating Worlds
                <br />
                <em className="font-serif italic text-white/80">Players Remember</em>
              </h1>

              <button className="liquid-glass-strong mt-10 flex items-center gap-4 rounded-full px-5 py-3 font-display text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95">
                View Our Games
                <IconBubble>
                  <Download size={15} strokeWidth={1.8} />
                </IconBubble>
              </button>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {['Game Development', 'Original Worlds', 'Interactive Entertainment'].map((label) => (
                  <span
                    key={label}
                    className="liquid-glass rounded-full px-4 py-2 font-body text-xs text-white/80"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-xl pb-2 text-center">
              <p className="font-body text-xs uppercase tracking-widest text-white/50">
                Game Development Studio
              </p>
              <p className="mt-3 font-display text-2xl font-medium tracking-[-0.04em] text-white/80 lg:text-3xl">
                We create <span className="font-serif italic text-white">original games</span> with immersive{' '}
                <span className="font-serif italic text-white/80">player experiences.</span>
              </p>
              <div className="mt-5 flex items-center justify-center gap-4">
                <span className="h-px w-12 bg-white/20" />
                <span className="font-body text-[0.65rem] uppercase tracking-[0.32em] text-white/50">
                  RIVERSOFT STUDIO
                </span>
                <span className="h-px w-12 bg-white/20" />
              </div>
            </div>
          </div>
        </div>

        <aside className="relative hidden min-h-screen w-[48%] flex-col p-6 lg:flex">
          <div className="relative z-10 flex items-center justify-end gap-3">
            <div className="liquid-glass flex h-11 items-center gap-1 rounded-full px-2">
              {socialLinks.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors transition-transform hover:scale-105 hover:text-white/80"
                >
                  <Icon size={15} strokeWidth={1.7} />
                </a>
              ))}
              <IconBubble>
                <ArrowRight size={15} strokeWidth={1.7} />
              </IconBubble>
            </div>

            {user ? (
              <div className="liquid-glass flex h-11 items-center gap-3 rounded-full px-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <UserIcon size={15} />
                  </span>
                  <span className="text-sm font-medium text-white">{user.name || user.email.split('@')[0]}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  title="Log out"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="liquid-glass flex h-11 items-center rounded-full px-5 font-display text-sm text-white/80 transition-transform hover:scale-105 active:scale-95"
              >
                Login
              </Link>
            )}
            <button
              className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
              aria-label="Studio highlight"
            >
              <Sparkles size={17} strokeWidth={1.7} />
            </button>
          </div>

          <article className="liquid-glass mt-24 w-56 rounded-3xl p-5 text-white/80">
            <h2 className="font-display text-lg font-medium tracking-[-0.04em] text-white">
              Who We Are
            </h2>
            <p className="mt-3 text-xs leading-5 text-white/60">
              RIVERSOFT is a game development studio focused on original games, immersive digital worlds, and meaningful player experiences.
            </p>
          </article>

          <div className="relative z-10 mt-auto w-full">
            <section className="liquid-glass glass-shell rounded-[2.5rem] p-4">
              <div className="grid grid-cols-2 gap-[var(--glass-gap)]">
                <FeatureCard
                  icon={Wand2}
                  title="What We Do"
                  copy="We build gameplay systems, world settings, visual direction, and interactive experiences from concept to release."
                />
                <FeatureCard
                  icon={BookOpen}
                  title="Our Games"
                  copy="Explore our projects, original game worlds, and playable experiences created by RIVERSOFT."
                />
              </div>

              <div className="liquid-glass glass-card mt-4 flex items-center gap-4 p-4 text-white/80">
                <img
                  src={heroFlowers}
                  alt="RIVERSOFT featured project artwork"
                  className="h-24 w-24 rounded-3xl object-cover grayscale"
                />
                <div>
                  <p className="font-body text-xs uppercase tracking-[0.28em] text-white/50">
                    Contact Us
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-medium tracking-[-0.04em] text-white">
                    Partnership and player inquiries
                  </h3>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </section>
    </main>
  );
}
