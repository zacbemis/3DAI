import Navbar from '../../components/nav_bar/nav_bar';
import landingBg from '../../assets/landing_page.jpg';

interface LandingPageProps {
  onLoginClick: () => void;
  onChatClick: () => void;
}

export function LandingPage({
  onLoginClick,
  onChatClick,
}: LandingPageProps) {
  return (
    <div className="page-fade-in relative flex min-h-screen w-full flex-col overflow-hidden font-sans antialiased">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${landingBg})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-zinc-950/75 via-zinc-950/55 to-[#0a0a0c]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(139,92,246,0.22),transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_80%_100%,rgba(34,211,238,0.12),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40 [mask-image:radial-gradient(ellipse_85%_65%_at_50%_45%,black,transparent)]"
        aria-hidden
      />

      <Navbar onLoginClick={onLoginClick} onChatClick={onChatClick} />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-[5.5rem] sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
            3D · AI · Workspace
          </p>

          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-white sm:mt-6 sm:text-6xl sm:leading-[1.05] md:text-7xl">
            Design and iterate with{' '}
            <span className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
              3DAI
            </span>
          </h1>

          {/* items-center prevents column flex from stretching buttons full-width (which broke label centering). Match nav .nav-btn: 8px 20px, gap 15px */}
          <div className="mt-6 flex flex-col items-center gap-[15px] sm:mt-8 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border-0 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 p-3 text-[0.9rem] font-semibold text-white shadow-[0_12px_40px_rgba(99,102,241,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(99,102,241,0.45)] active:translate-y-0"
              onClick={onLoginClick}
            >
              Get started
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] p-3 text-[0.9rem] font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/25 hover:bg-white/[0.1] active:scale-[0.99]"
              onClick={onChatClick}
            >
              Open chat
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
