import Navbar from '../../components/nav_bar/nav_bar';
import landingBg from '../../assets/higher_res_bg.png';
import logo from '../../assets/logo_transparent.png';

interface LandingPageProps {
  onLoginClick: () => void;
  onChatClick: () => void;
  onLogout?: () => void;
}

export function LandingPage({
  onLoginClick,
  onChatClick,
  onLogout,
}: LandingPageProps) {
  return (
    <div className="animate-page-fade-in relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0a0a0c] font-sans antialiased">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
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

      <Navbar onLoginClick={onLoginClick} onChatClick={onChatClick} onLogout={onLogout} />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-[5.5rem] sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <img
            src={logo}
            alt="3DAI"
            className="h-28 w-auto object-contain sm:h-36 md:h-44"
          />

          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-white sm:mt-6 sm:text-6xl sm:leading-[1.05] md:text-7xl">
            Design and iterate with{' '}
            <span className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
              3DAI
            </span>
          </h1>

          <div className="mt-6 sm:mt-8">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border-0 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 p-3 text-[0.9rem] font-semibold text-white shadow-[0_12px_40px_rgba(99,102,241,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(99,102,241,0.45)] active:translate-y-0"
              onClick={onLoginClick}
            >
              Get started
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
