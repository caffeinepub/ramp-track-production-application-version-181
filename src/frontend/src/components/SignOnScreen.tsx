import { useEffect } from 'react';

interface CurrentUser {
  username: string;
  roles: string[];
}

interface SignOnScreenProps {
  currentUser: CurrentUser | null;
  onAgentLogin: () => void;
  onAdminLogin: () => void;
  onBack: () => void;
}

export default function SignOnScreen({ currentUser, onAgentLogin, onAdminLogin, onBack }: SignOnScreenProps) {
  // Redirect to login if no user
  useEffect(() => {
    if (!currentUser) {
      onBack();
    }
  }, [currentUser, onBack]);

  if (!currentUser) {
    return null;
  }

  const hasAdminRole = currentUser.roles.includes('admin');
  const isAgentOnly = currentUser.roles.length === 1 && currentUser.roles[0] === 'agent';

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: 'url(/assets/SignInBackgroundLower.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center gap-6 md:gap-8">
        <button
          onClick={onAgentLogin}
          className="w-[36%] max-w-xs transition-transform active:scale-95 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/50 rounded-2xl"
          aria-label="Agent Login"
        >
          <img 
            src="/assets/AgentLogin.png" 
            alt="Agent Login"
            className="w-full h-auto rounded-2xl shadow-2xl"
          />
        </button>

        {!isAgentOnly && hasAdminRole && (
          <button
            onClick={onAdminLogin}
            className="w-[36%] max-w-xs transition-transform active:scale-95 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-500/50 rounded-2xl"
            aria-label="Management / Admin Login"
          >
            <img 
              src="/assets/managementlogin.png" 
              alt="Management / Admin Login"
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
          </button>
        )}

        <button
          onClick={onBack}
          className="mt-4 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
