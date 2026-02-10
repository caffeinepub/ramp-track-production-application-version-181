import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';

interface OperatorHomeScreenProps {
  onTakeEquipment: () => void;
  onReturnEquipment: () => void;
  onReportIssue: () => void;
  onBack: () => void;
}

export default function OperatorHomeScreen({ 
  onTakeEquipment, 
  onReturnEquipment, 
  onReportIssue, 
  onBack 
}: OperatorHomeScreenProps) {
  const { auth } = useAuth();

  // Get display name directly from auth - single source of truth
  const getDisplayName = (): string => {
    console.log('[OperatorHomeScreen] Using auth for identity:', auth?.badgeId ?? auth?.user);
    
    if (!auth) {
      return 'Unknown User';
    }
    
    return auth.name ?? auth.badgeId ?? 'Unknown User';
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(/assets/HomescreenBackground.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/50 backdrop-blur-[2px]" />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="bg-primary/95 backdrop-blur-sm text-primary-foreground shadow-lg">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ramp Track</h1>
              <p className="text-sm opacity-90">Welcome, {getDisplayName()}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <span>←</span>
              Back to Sign On
            </Button>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 text-white drop-shadow-lg">What would you like to do?</h2>
              <p className="text-white/90 drop-shadow">Select an action below</p>
            </div>

            <div className="grid gap-4">
              <div 
                className="cursor-pointer transition-all active:scale-[0.98] border"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.20)',
                  borderRadius: '18px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
                }}
                onClick={onTakeEquipment}
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)';
                }}
              >
                <div className="p-8 flex items-center gap-6">
                  <div className="bg-primary/10 p-4 rounded-2xl flex items-center justify-center">
                    <img 
                      src="/assets/Check_Out_Icon-1.png" 
                      alt="Check Out" 
                      className="h-16 w-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/Check_Out_Icon.png';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>Take Equipment</h3>
                    <p style={{ color: '#cbd5f5' }}>Check out equipment for use</p>
                  </div>
                </div>
              </div>

              <div 
                className="cursor-pointer transition-all active:scale-[0.98] border"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.20)',
                  borderRadius: '18px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
                }}
                onClick={onReturnEquipment}
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)';
                }}
              >
                <div className="p-8 flex items-center gap-6">
                  <div className="bg-accent/10 p-4 rounded-2xl flex items-center justify-center">
                    <img 
                      src="/assets/Check_In_Icon-1.png" 
                      alt="Check In" 
                      className="h-16 w-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/Check_In_Icon.png';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>Return Equipment</h3>
                    <p style={{ color: '#cbd5f5' }}>Check in equipment after use</p>
                  </div>
                </div>
              </div>

              <div 
                className="cursor-pointer transition-all active:scale-[0.98] border"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.20)',
                  borderRadius: '18px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
                }}
                onClick={onReportIssue}
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)';
                }}
              >
                <div className="p-8 flex items-center gap-6">
                  <div className="bg-destructive/10 p-4 rounded-2xl flex items-center justify-center">
                    <img 
                      src="/assets/Report_Issue_Icon-1.png" 
                      alt="Report Issue" 
                      className="h-16 w-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/Report_Issue_Icon.png';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>Report Issue</h3>
                    <p style={{ color: '#cbd5f5' }}>Report equipment problems</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-6 text-center text-sm text-white/90 drop-shadow-lg">
          © Jayson James & Ramp Track Systems
        </footer>
      </div>
    </div>
  );
}
