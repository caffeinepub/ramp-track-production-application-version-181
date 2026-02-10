import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CurrentUser } from '../App';
import { useAuth } from '../contexts/AuthContext';

interface RoleSelectionScreenProps {
  currentUser: CurrentUser | null;
  onContinueAsAgent: () => void;
  onContinueToAdmin: () => void;
  onBack: () => void;
}

export default function RoleSelectionScreen({
  currentUser,
  onContinueAsAgent,
  onContinueToAdmin,
  onBack,
}: RoleSelectionScreenProps) {
  const { auth } = useAuth();

  // Display name using ONLY auth context - single source of truth
  const getDisplayName = (): string => {
    console.log('[RoleSelectionScreen] Header name source = auth');
    
    if (!auth) {
      console.warn('[RoleSelectionScreen] auth is null, showing fallback');
      return 'Unknown User';
    }
    
    // Use auth.name with fallback to badgeId
    const displayName = auth.name ?? auth.badgeId ?? 'Unknown User';
    
    // Log warning if name is missing
    if (!auth.name) {
      console.warn('[RoleSelectionScreen] auth.name is missing, using fallback:', displayName);
    }
    
    return displayName;
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        backgroundImage: 'url(/assets/HomescreenBackground.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Header with back button and signed-in user display */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <div className="text-white text-right pr-safe">
          <p className="text-sm opacity-90 leading-tight">Signed in as</p>
          <p className="font-semibold leading-tight truncate max-w-[200px]">
            {getDisplayName()}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
            Select Your Role
          </h1>
          <p className="text-xl text-white/90 drop-shadow-md">
            How would you like to continue?
          </p>
        </div>

        <div className="w-full flex flex-col items-center gap-5">
          {/* Continue as Agent - Image Button */}
          <button
            onClick={onContinueAsAgent}
            className="transition-all duration-200 active:scale-95 hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-blue-500/50 rounded-xl shadow-lg"
          >
            <img
              src="/assets/AgentLogin.png"
              alt="Continue as Agent"
              className="h-auto rounded-xl"
              style={{
                width: '75vw',
                maxWidth: '80vw',
                maxHeight: '220px',
                objectFit: 'contain',
              }}
            />
          </button>

          {/* Continue to Admin - Image Button */}
          <button
            onClick={onContinueToAdmin}
            className="transition-all duration-200 active:scale-95 hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-orange-500/50 rounded-xl shadow-lg"
          >
            <img
              src="/assets/managementlogin.png"
              alt="Continue to Admin"
              className="h-auto rounded-xl"
              style={{
                width: '75vw',
                maxWidth: '80vw',
                maxHeight: '220px',
                objectFit: 'contain',
              }}
            />
          </button>
        </div>
      </div>

      {/* Footer - Updated with new branding */}
      <div className="p-4 pb-6 text-center bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-white/50 text-xs">
          © Jayson James & Ramp Track Systems
        </p>
      </div>
    </div>
  );
}
