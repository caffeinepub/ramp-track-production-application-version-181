import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';

interface NotFoundProps {
  onNavigateHome?: () => void;
}

export default function NotFound({ onNavigateHome }: NotFoundProps) {
  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{
        backgroundImage: 'url(/assets/HomescreenBackground.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8 shadow-2xl text-center"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
        }}
      >
        <div className="flex justify-center mb-6">
          <AlertCircle className="h-20 w-20 text-orange-400" />
        </div>

        <h1 className="text-5xl font-bold text-white mb-4">404</h1>
        
        <h2 className="text-2xl font-semibold text-white mb-3">
          Page Not Found
        </h2>
        
        <p className="text-white/80 text-lg mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Button
          onClick={handleNavigateHome}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
        >
          <Home className="h-5 w-5 mr-2" />
          Return to Home
        </Button>

        <div className="mt-8 pt-6 border-t border-white/20">
          <p className="text-white/50 text-xs">
            © Ramp Track Systems & Jayson James
          </p>
        </div>
      </div>
    </div>
  );
}
