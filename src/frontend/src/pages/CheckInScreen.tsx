import { useState, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import EquipmentQRScanner from '../components/EquipmentQRScanner';
import { useCreateAssignment, useUpdateEquipment, useLogActivity, useGetCallerUserProfile, useGetEquipment } from '../hooks/useQueries';
import { Loader2, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { findById, updateEquipmentStatus, normalizeEquipmentId } from '../lib/equipmentRegistry';
import { logEvent } from '../lib/equipmentHistory';
import { appendAuditEvent } from '../lib/auditLog';
import { getAutoLocation } from '../lib/autoGateLocator';
import { ensureUserContext } from '../lib/ensureUserContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface CheckInScreenProps {
  onBack: () => void;
}

// Helper to format equipment type for display
const formatEquipmentType = (type: string): string => {
  if (type === 'ELECTRIC_TUG') return 'ELECTRIC TUG';
  if (type === 'TUG') return 'TUG';
  return type.replace('_', ' ');
};

export default function CheckInScreen({ onBack }: CheckInScreenProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [equipmentId, setEquipmentId] = useState('');
  const [rawScanValue, setRawScanValue] = useState('');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isValidatingSession, setIsValidatingSession] = useState(false);

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
    if (localEquipment.status !== 'ASSIGNED') {
      setError(`Equipment is currently ${localEquipment.status}. Only ASSIGNED equipment can be checked in.`);
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

  const handleCheckIn = async () => {
    // DEFENSIVE GUARD: Check auth state at the top
    if (auth === null || !auth.badgeId) {
      setError('Session still loading. Please wait a moment and try again.');
      toast.error('Session Not Ready', {
        description: 'Session still loading. Please wait a moment and try again.',
      });
      return;
    }

    // Phase 2a: Validate session before write operation
    setIsValidatingSession(true);
    setError('');

    try {
      console.log('[CheckInScreen] Equipment checkin uses auth as identity source');

      // Get operator ID from auth ONLY - single source of truth
      const operatorId = auth.badgeId || auth.user;

      if (!operatorId) {
        setError('User profile not found. Please log in again.');
        setIsValidatingSession(false);
        return;
      }

      if (!equipmentId) {
        setError('Equipment ID is required.');
        setIsValidatingSession(false);
        return;
      }

      if (!gpsData || !locationLabel) {
        toast.error('Location Required', {
          description: 'Please wait for GPS location to be captured.',
        });
        setError('GPS location is required. Please wait for location capture to complete.');
        setIsValidatingSession(false);
        return;
      }

      // Validate session - pass the operator's badge ID for validation
      const isValid = await ensureUserContext(operatorId);
      
      if (!isValid) {
        // Error message already shown by ensureUserContext
        setIsValidatingSession(false);
        return;
      }

      setIsValidatingSession(false);

      const timestamp = BigInt(Date.now() * 1000000);
      const assignmentId = `${equipmentId}-${Date.now()}`;

      // Update local registry status with history
      updateEquipmentStatus(equipmentId, 'AVAILABLE', operatorId, locationLabel, 'Equipment returned');

      // Log event to in-memory history
      logEvent({
        id: `event-${Date.now()}`,
        equipmentId,
        eventType: 'CHECK_IN',
        operator: operatorId,
        timestamp: new Date().toISOString(),
        location: locationLabel,
        notes: 'Equipment returned',
      });

      // Append to audit log with GPS data - using auth for user info
      appendAuditEvent({
        action: 'checkin',
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
        action: 'check_in',
        timestamp,
        location: locationLabel,
      });

      // Update equipment status in backend
      await updateEquipment.mutateAsync({
        id: equipmentId,
        name: equipment?.name || equipmentId,
        status: 'available',
        assigned_operator: undefined,
        last_location: locationLabel,
        last_update_time: timestamp,
      });

      // Log activity
      await logActivity.mutateAsync({
        id: `activity-${Date.now()}`,
        action: 'check_in',
        user_id: operatorId,
        timestamp,
        details: `Checked in equipment ${equipmentId} at ${locationLabel}`,
      });

      // Show success toast
      toast.success('Check-In Successful', {
        description: `Equipment ${equipmentId} checked in at ${locationLabel}`,
      });

      setStep('success');
    } catch (err: any) {
      console.error('Check-in error:', err);
      setError(err.message || 'Failed to check in equipment. Please try again.');
      toast.error('Check-In Failed', {
        description: err.message || 'Failed to check in equipment. Please try again.',
      });
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
  };

  const handleRetry = () => {
    setError('');
    setRawScanValue('');
    handleOpenScanner();
  };

  // PARENT ISOLATION: Render scanner in isolated tree
  if (showScanner && scannerMountedRef.current) {
    return <EquipmentQRScanner mode="equipment" title="Scan Equipment to Return" onScan={handleScan} onClose={handleCloseScanner} />;
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
        <header className="bg-accent/95 backdrop-blur-sm text-accent-foreground shadow-lg">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={onBack}>
              ← Back to Agent Menu
            </Button>
            <h1 className="text-2xl font-bold">Return Equipment</h1>
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
                  <CardTitle style={{ color: '#ffffff' }}>Check In Equipment</CardTitle>
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
                  <CardTitle style={{ color: '#ffffff' }}>Confirm Check-In</CardTitle>
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
                      onClick={handleCheckIn} 
                      disabled={createAssignment.isPending || gpsLoading || !locationLabel || isValidatingSession} 
                      className="flex-1"
                    >
                      {isValidatingSession ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reconnecting...
                        </>
                      ) : createAssignment.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Confirm Check-In'
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
                    Check-In Successful!
                  </h2>
                  <p style={{ color: '#cbd5f5' }}>Equipment {equipmentId} has been returned.</p>
                  {locationLabel && (
                    <p className="text-sm" style={{ color: '#cbd5f5' }}>
                      Location: {locationLabel}
                    </p>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleReset} variant="outline" className="flex-1">
                      Check In Another
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
