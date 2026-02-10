export default function SplashScreen() {
  return (
    <div 
      className="fixed inset-0"
      style={{
        backgroundImage: 'url(/assets/RampTrackSplash.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/30 backdrop-blur-sm">
          <div className="h-5 w-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/90 text-sm font-medium">Loading Ramp Track…</p>
        </div>
      </div>
    </div>
  );
}
