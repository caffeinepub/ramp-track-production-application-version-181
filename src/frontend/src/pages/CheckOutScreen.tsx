import { useState, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import EquipmentQRScanner from '../components/EquipmentQRScanner';
import { useCreateAssignment, useUpdateEquipment, useLogActivity, useGetCallerUserProfile, useGetEquipment } from '../hooks/useQueries';
import { Loader2, CheckCircle2, AlertCircle, MapPin, Info } from 'lucide-react';
import { findById, updateEquipmentStatus, normalizeEquipmentId } from '../lib/equipmentRegistry';
import { logEvent } from '../lib/equipmentHistory';
import { appendAuditEvent } from '../lib/auditLog';
import { getAutoLocation } from '../lib/autoGateLocator';
import { ensureUserContext } from '../lib/ensureUserContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface CheckOutScreenProps {
  onBack: () => void;
}

// Helper to format equipment type for display
const formatEquipmentType = (type: string): string => {
  if (type === 'ELECTRIC_TUG') return 'ELECTRIC TUG';
  if (type === 'TUG') return 'TUG';
  return type.replace('_', ' ');
};

export default function CheckOutScreen({ onBack }: CheckOutScreenProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [equipmentId, setEquipmentId] = useState('');
  const [rawScanValue, setRawScanValue] = useState('');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [profileMissingNotice, setProfileMissingNotice] = useState<string>('');

  // PARENT ISOLATION: Prevent scanner re-mount by freezing visibility with ref
  const scannerMountedRef = useRef(false);

  const { auth } = useAuth();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: equipment } = useGetEquipment(equipmentId);
  const createAssignment = useCreateAssignment();
  const updateEquipment = useUpdateEquipment();
  const logActivity = useLogActivity();

  // PARENT ISOLATION: Memoized callbacks with stable references
  const handleScan = useCallback((scannedId: string) => {
    scannerMountedRef.current = false;
    setShowScanner(false);

    // Store raw scan value for error display
    setRawScanValue(scannedId);

    // Normalize the scanned ID
    const normalizedId = normalizeEquipmentId(scannedId);

    // Validate against local registry
    const localEquipment = findById(normalizedId);
    if (!localEquipment) {
      setError(`Equipment not found: ${scannedId} → ${normalizedId}`);
      return;
    }

    // Validate status
    if (localEquipment.status !== 'AVAILABLE') {
      setError(`Equipment is currently ${localEquipment.status}. Only AVAILABLE equipment can be checked out.`);
      return;
    }

    setEquipmentId(normalizedId);
    setStep('confirm');
    captureGPS();
  }, []);

  const handleCloseScanner = useCallback(() => {
    scannerMountedRef.current = false;
    setShowScanner(false);
  }, []);

  const handleOpenScanner = useCallback(() => {
    if (!scannerMountedRef.current) {
      scannerMountedRef.current = true;
      setShowScanner(true);
    }
  }, []);

  const captureGPS = () => {
    if ('geolocation' in navigator) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          // Store GPS data for backend
          setGpsData({ lat, lng, accuracy });

          // Get automatic location label
          const autoLabel = getAutoLocation(lat, lng);
          setLocationLabel(autoLabel);
          setGpsLoading(false);
        },
        (error) => {
          console.error('GPS error:', error);
          setError('Failed to capture GPS location. Please ensure location services are enabled.');
          setGpsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError('GPS is not available on this device.');
    }
  };

  const handleCheckOut = async () => {
    // DEFENSIVE GUARD: Check auth state at the top
    if (auth === null || !auth.badgeId) {
      setError('Session still loading. Please wait a moment and try again.');
      toast.error('Session Not Ready', {
        description: 'Session still loading. Please wait a moment and try again.',
      });
      return;
    }

    // Wrap entire checkout handler in try/finally to prevent stuck disabled state
    setIsValidatingSession(true);
    
    try {
      setError('');
      setProfileMissingNotice('');

      console.log('[CheckOutScreen] Equipment checkout uses auth as identity source');

      // Get operator ID from auth ONLY - single source of truth
      const operatorId = auth.badgeId || auth.user;

      if (!operatorId) {
        setError('Missing badge ID in session. Please log in again.');
        return;
      }

      if (!equipmentId) {
        setError('Equipment ID is required.');
        return;
      }

      if (!gpsData || !locationLabel) {
        toast.error('Location Required', {
          description: 'Please wait for GPS location to be captured.',
        });
        setError('GPS location is required. Please wait for location capture to complete.');
        return;
      }

      // Validate session - pass the operator's badge ID for validation
      let sessionValid = false;
      let profileMissing = false;
      
      try {
        sessionValid = await ensureUserContext(operatorId);
      } catch (err: any) {
        const errorMessage = err?.message || '';
        const errorCode = err?.code;
        
        // Tight checks for profile-missing errors
        if (
          errorCode === 'PROFILE_MISSING' ||
          errorMessage.toLowerCase().includes('user profile not found') ||
          errorMessage.toLowerCase().includes('getcalleruserprofile') ||
          errorMessage.toLowerCase().includes('only users can view profiles')
        ) {
          // Profile missing - show notice but allow operation to continue
          profileMissing = true;
          sessionValid = true;
          setProfileMissingNotice('Profile not found in backend — continuing with local session.');
          console.warn('[CheckOutScreen] Profile missing, continuing with local session:', errorMessage);
        } else {
          // Real authentication failure - rethrow
          throw err;
        }
      }
      
      if (!sessionValid) {
        // Error message already shown by ensureUserContext
        return;
      }

      const timestamp = BigInt(Date.now() * 1000000);
      const assignmentId = `${equipmentId}-${Date.now()}`;

      // Update local registry status with history
      updateEquipmentStatus(equipmentId, 'ASSIGNED', operatorId, locationLabel, 'Equipment checked out');

      // Log event to in-memory history
      logEvent({
        id: `event-${Date.now()}`,
        equipmentId,
        eventType: 'CHECK_OUT',
        operator: operatorId,
        timestamp: new Date().toISOString(),
        location: locationLabel,
        notes: 'Equipment checked out',
      });

      // Append to audit log with GPS data - using auth for user info
      appendAuditEvent({
        action: 'checkout',
        equipmentId,
        locationLabel,
        lat: gpsData.lat,
        lng: gpsData.lng,
        accuracyMeters: gpsData.accuracy,
        user: {
          badge: auth.badgeId || auth.user,
          username: auth.user,
          displayName: auth.name,
          roles: [auth.role],
        },
      });

      // Create assignment record
      await createAssignment.mutateAsync({
        id: assignmentId,
        equipment_id: equipmentId,
        operator_id: operatorId,
        action: 'check_out',
        timestamp,
        location: locationLabel,
      });

      // Update equipment status in backend
      await updateEquipment.mutateAsync({
        id: equipmentId,
        name: equipment?.name || equipmentId,
        status: 'assigned',
        assigned_operator: operatorId,
        last_location: locationLabel,
        last_update_time: timestamp,
      });

      // Log activity
      await logActivity.mutateAsync({
        id: `activity-${Date.now()}`,
        action: 'check_out',
        user_id: operatorId,
        timestamp,
        details: `Checked out equipment ${equipmentId} at ${locationLabel}`,
      });

      // Show success toast
      toast.success('Check-Out Successful', {
        description: `Equipment ${equipmentId} checked out at ${locationLabel}`,
      });

      setStep('success');
    } catch (err: any) {
      console.error('Check-out error:', err);
      
      // Check if this is a profile-missing error (in case it wasn't caught above)
      const errorMessage = err?.message || '';
      const errorCode = err?.code;
      
      if (
        errorCode === 'PROFILE_MISSING' ||
        errorMessage.toLowerCase().includes('user profile not found') ||
        errorMessage.toLowerCase().includes('getcalleruserprofile') ||
        errorMessage.toLowerCase().includes('only users can view profiles')
      ) {
        // Profile missing - show non-blocking notice
        setProfileMissingNotice('Profile not found in backend — continuing with local session.');
        console.warn('[CheckOutScreen] Profile missing error caught, continuing with local session');
        return;
      }
      
      // For other errors, show error message
      setError(errorMessage || 'Failed to check out equipment. Please try again.');
      toast.error('Check-Out Failed', {
        description: errorMessage || 'Failed to check out equipment. Please try again.',
      });
    } finally {
      // Always clear validating state to prevent stuck disabled button
      setIsValidatingSession(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setEquipmentId('');
    setRawScanValue('');
    setLocationLabel('');
    setGpsData(null);
    setGpsLoading(false);
    setError('');
    setIsValidatingSession(false);
    setProfileMissingNotice('');
  };

  const handleRetry = () => {
    setError('');
    setRawScanValue('');
    handleOpenScanner();
  };

  // PARENT ISOLATION: Render scanner in isolated tree
  if (showScanner && scannerMountedRef.current) {
    return <EquipmentQRScanner mode="equipment" title="Scan Equipment to Take" onScan={handleScan} onClose={handleCloseScanner} />;
  }

  // Display name using ONLY auth - single source of truth
  const signedInName = auth?.name ?? auth?.badgeId ?? 'Unknown User';
  
  // Log warning if name is missing
  if (auth && !auth.name) {
    console.warn('[CheckOutScreen] auth.name is missing, using fallback:', signedInName);
  }

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
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="sm" onClick={onBack}>
                ← Back to Agent Menu
              </Button>
              <h1 className="text-2xl font-bold">Take Equipment</h1>
            </div>
            <div className="text-sm text-primary-foreground/90">
              Signed in as {signedInName}
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {step === 'input' && (
              <Card
                className="border shadow-2xl"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255,255,255,0.18)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                }}
              >
                <CardHeader>
                  <CardTitle style={{ color: '#ffffff' }}>Check Out Equipment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription style={{ color: '#cbd5f5' }}>
                        {error}
                        <Button onClick={handleRetry} variant="outline" size="sm" className="mt-2 w-full">
                          Try again
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button onClick={handleOpenScanner} className="w-full py-6 text-lg">
                    Start QR Scanner
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 'confirm' && (
              <Card
                className="border shadow-2xl"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255,255,255,0.18)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                }}
              >
                <CardHeader>
                  <CardTitle style={{ color: '#ffffff' }}>Confirm Check-Out</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label style={{ color: '#cbd5f5' }}>Equipment ID</Label>
                    <p className="text-lg font-semibold mt-1" style={{ color: '#ffffff' }}>
                      {equipmentId}
                    </p>
                    {(() => {
                      const localEquipment = findById(equipmentId);
                      if (localEquipment) {
                        return (
                          <>
                            <p className="text-sm mt-1" style={{ color: '#cbd5f5' }}>
                              Type: {formatEquipmentType(localEquipment.type)}
                            </p>
                            {localEquipment.label && (
                              <p className="text-sm" style={{ color: '#cbd5f5' }}>
                                Label: {localEquipment.label}
                              </p>
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div>
                    <Label style={{ color: '#cbd5f5' }}>
                      <MapPin className="inline h-4 w-4 mr-1" />
                      Location
                    </Label>
                    {gpsLoading ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#cbd5f5' }} />
                        <p className="text-sm" style={{ color: '#cbd5f5' }}>
                          Detecting location...
                        </p>
                      </div>
                    ) : locationLabel ? (
                      <p className="text-lg font-semibold mt-1" style={{ color: '#ffffff' }}>
                        {locationLabel}
                      </p>
                    ) : (
                      <p className="text-sm mt-1" style={{ color: '#cbd5f5' }}>
                        Waiting for GPS...
                      </p>
                    )}
                  </div>

                  {profileMissingNotice && (
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                      <Info className="h-4 w-4 text-blue-400" />
                      <AlertDescription className="text-blue-200 text-sm">
                        {profileMissingNotice}
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription style={{ color: '#cbd5f5' }}>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleReset} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCheckOut} 
                      disabled={createAssignment.isPending || gpsLoading || !locationLabel || isValidatingSession} 
                      className="flex-1"
                    >
                      {isValidatingSession ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validating...
                        </>
                      ) : createAssignment.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Confirm Check-Out'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'success' && (
              <Card
                className="border shadow-2xl"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255,255,255,0.18)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                }}
              >
                <CardContent className="py-12 text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                  <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                    Check-Out Successful!
                  </h2>
                  <p style={{ color: '#cbd5f5' }}>Equipment {equipmentId} has been assigned to you.</p>
                  {locationLabel && (
                    <p className="text-sm" style={{ color: '#cbd5f5' }}>
                      Location: {locationLabel}
                    </p>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleReset} variant="outline" className="flex-1">
                      Check Out Another
                    </Button>
                    <Button onClick={onBack} className="flex-1">
                      Back to Menu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
