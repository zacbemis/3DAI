import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onLoginClick: () => void;
  onChatClick: () => void;
  onLogout?: () => void;
}

export default function Navbar({ onLoginClick, onChatClick, onLogout }: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[70px] items-center justify-between border-b border-white/10 bg-white/[0.03] px-[5%] backdrop-blur-lg">
      <span className="text-2xl font-extrabold tracking-tight text-white">
        3DAI
      </span>
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-white/60">
              {user?.display_name ?? user?.email}
            </span>
            <button
              type="button"
              className="rounded-lg bg-white/[0.08] p-2.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-white/[0.18]"
              onClick={onChatClick}
            >
              Chat
            </button>
            <button
              type="button"
              className="rounded-lg bg-transparent p-2.5 text-[0.9rem] font-semibold text-white/60 transition-colors hover:bg-white/15 hover:text-white"
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="rounded-lg bg-transparent p-2.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-white/15"
              onClick={onLoginClick}
            >
              Log In
            </button>
            <button
              type="button"
              className="rounded-lg bg-white/[0.08] p-2.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-white/[0.18]"
              onClick={onChatClick}
            >
              Chat
            </button>
          </>
        )}
      </div>
    </nav>
  );
}