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
    <div
      className="page-fade-in flex h-screen w-full flex-col overflow-hidden bg-cover bg-center bg-no-repeat font-sans antialiased"
      style={{ backgroundImage: `url(${landingBg})` }}
    >
      <Navbar onLoginClick={onLoginClick} onChatClick={onChatClick} />
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="m-0 text-center text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)] md:text-7xl md:leading-none lg:text-8xl">
          Welcome to 3DAI
        </h1>
        <p className="mb-10 mt-4 border-y border-white/10 py-2.5 text-center text-lg font-medium uppercase tracking-[0.15rem] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Your intelligent 3D assistant.
        </p>
        <button
          type="button"
          className="cursor-pointer rounded-full border-0 bg-gradient-to-br from-[#646cff] to-[#9089ff] px-10 py-3.5 text-lg font-semibold text-white shadow-[0_10px_20px_rgba(100,108,255,0.3)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(100,108,255,0.5)] hover:brightness-110 active:translate-y-0"
          onClick={onLoginClick}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
