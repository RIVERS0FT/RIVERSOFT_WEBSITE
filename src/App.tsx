import type { ReactNode } from "react";
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
} from "lucide-react";
import heroFlowersFallback from "@/assets/hero-flowers.svg";

const backgroundVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4";

const heroFlowersPreferred = "/src/assets/hero-flowers.png";
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
        src="/logo.png"
        alt=""
        className="h-full w-full rounded-full object-contain"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/logo.svg";
        }}
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
    <article className="liquid-glass rounded-3xl p-5 text-white/80">
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

export default function App() {
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
              <a
                href="#"
                className="group flex items-center gap-3 transition-transform hover:scale-105"
                aria-label="Bloom home"
              >
                <LogoMark size={32} />
                <span className="font-display text-2xl font-semibold tracking-tighter text-white">
                  bloom
                </span>
              </a>

              <button className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm text-white/80 transition-transform hover:scale-105 active:scale-95">
                <Menu size={17} strokeWidth={1.8} />
                Menu
              </button>
            </nav>

            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center lg:py-10">
              <LogoMark size={80} />

              <h1 className="mt-8 max-w-4xl font-display text-6xl font-medium leading-[0.9] tracking-[-0.05em] text-white lg:text-7xl">
                Innovating the
                <br />
                <em className="font-serif italic text-white/80">spirit of bloom</em> AI
              </h1>

              <button className="liquid-glass-strong mt-10 flex items-center gap-4 rounded-full px-5 py-3 font-display text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95">
                Explore Now
                <IconBubble>
                  <Download size={15} strokeWidth={1.8} />
                </IconBubble>
              </button>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {['Artistic Gallery', 'AI Generation', '3D Structures'].map((label) => (
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
                Visionary Design
              </p>
              <p className="mt-3 font-display text-2xl font-medium tracking-[-0.04em] text-white/80 lg:text-3xl">
                We imagined a <span className="font-serif italic text-white">realm</span> with no{' '}
                <span className="font-serif italic text-white/80">ending.</span>
              </p>
              <div className="mt-5 flex items-center justify-center gap-4">
                <span className="h-px w-12 bg-white/20" />
                <span className="font-body text-[0.65rem] uppercase tracking-[0.32em] text-white/50">
                  Marcus Aurelio
                </span>
                <span className="h-px w-12 bg-white/20" />
              </div>
            </div>
          </div>
        </div>

        <aside className="relative hidden min-h-screen w-[48%] flex-col p-6 lg:flex">
          <div className="relative z-10 flex items-center justify-end gap-3">
            <div className="liquid-glass flex items-center gap-1 rounded-full p-2">
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

            <button className="liquid-glass rounded-full px-5 py-3 font-display text-sm text-white/80 transition-transform hover:scale-105 active:scale-95">
              Account
            </button>
            <button
              className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
              aria-label="AI assistant"
            >
              <Sparkles size={17} strokeWidth={1.7} />
            </button>
          </div>

          <article className="liquid-glass mt-24 w-56 rounded-3xl p-5 text-white/80">
            <h2 className="font-display text-lg font-medium tracking-[-0.04em] text-white">
              Enter our ecosystem
            </h2>
            <p className="mt-2 font-body text-xs leading-5 text-white/60">
              Generate, sculpt, and archive floral environments through a living AI design layer.
            </p>
          </article>

          <div className="relative z-10 mt-auto">
            <div className="liquid-glass rounded-[2.5rem] p-4">
              <div className="grid grid-cols-2 gap-4">
                <FeatureCard
                  icon={Wand2}
                  title="Processing"
                  copy="Adaptive prompts translate stems, volume, and texture into precise botanical forms."
                />
                <FeatureCard
                  icon={BookOpen}
                  title="Growth Archive"
                  copy="Every generated structure is stored as a reusable creative memory for your studio."
                />
              </div>

              <article className="liquid-glass mt-4 flex items-center gap-4 rounded-3xl p-4">
                <div className="h-16 w-24 overflow-hidden rounded-2xl bg-white/10">
                  <img
                    src={heroFlowersPreferred}
                    alt="Grayscale floral sculpture thumbnail"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = heroFlowersFallback;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-medium tracking-[-0.04em] text-white">
                    Advanced Plant Sculpting
                  </h3>
                  <p className="mt-1 max-w-md font-body text-xs leading-5 text-white/60">
                    Shape impossible floral systems with AI-assisted geometry and liquid spatial cues.
                  </p>
                </div>
                <button
                  className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-white transition-transform hover:scale-105 active:scale-95"
                  aria-label="Open Advanced Plant Sculpting"
                >
                  +
                </button>
              </article>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
