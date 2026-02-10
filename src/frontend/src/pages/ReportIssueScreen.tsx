import { useState, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';
import EquipmentQRScanner from '../components/EquipmentQRScanner';
import { useCamera } from '../camera/useCamera';
import { useReportIssue, useUpdateEquipment, useLogActivity, useGetCallerUserProfile, useGetEquipment } from '../hooks/useQueries';
import { ExternalBlob } from '../backend';
import { Loader2, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { findById, updateEquipmentStatus, normalizeEquipmentId } from '../lib/equipmentRegistry';
import { logEvent } from '../lib/equipmentHistory';
import { ensureUserContext } from '../lib/ensureUserContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface ReportIssueScreenProps {
  onBack: () => void;
}

// Helper to format equipment type for display
const formatEquipmentType = (type: string): string => {
  if (type === 'ELECTRIC_TUG') return 'ELECTRIC TUG';
  if (type === 'TUG') return 'TUG';
  return type.replace('_', ' ');
};

export default function ReportIssueScreen({ onBack }: ReportIssueScreenProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [step, setStep] = useState<'input' | 'details' | 'photo' | 'success'>('input');
  const [equipmentId, setEquipmentId] = useState('');
  const [rawScanValue, setRawScanValue] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [gpsLocation, setGpsLocation] = useState<string>('');
  const [grounded, setGrounded] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isValidatingSession, setIsValidatingSession] = useState(false);

  // PARENT ISOLATION: Prevent scanner re-mount by freezing visibility with ref
  const scannerMountedRef = useRef(false);

  const { auth } = useAuth();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: equipment } = useGetEquipment(equipmentId);
  const reportIssue = useReportIssue();
  const updateEquipment = useUpdateEquipment();
  const logActivity = useLogActivity();

  const {
    isActive: cameraActive,
    error: cameraError,
    isLoading: cameraLoading,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef: cameraVideoRef,
    canvasRef: cameraCanvasRef,
  } = useCamera({
    facingMode: 'environment',
    quality: 0.8,
  });

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

    setEquipmentId(normalizedId);
    setStep('details');
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
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
          setGpsLocation(gps);
          setLocation(gps);
        },
        (error) => {
          console.error('GPS error:', error);
          setError('GPS unavailable. Please enter location manually.');
        }
      );
    } else {
      setError('GPS not supported. Please enter location manually.');
    }
  };

  const handleTakePhoto = async () => {
    const photo = await capturePhoto();
    if (photo) {
      setPhotoFile(photo);
      setPhotoPreview(URL.createObjectURL(photo));
      stopCamera();
    }
  };

  const handleSubmit = async () => {
    // Phase 2a: Validate session before write operation
    setIsValidatingSession(true);
    setError('');

    try {
      // Show reconnecting message
      toast.loading('Validating session...', { id: 'session-validation' });

      const isValid = await ensureUserContext();
      
      toast.dismiss('session-validation');

      if (!isValid) {
        setError('Session expired. Please log in again.');
        setIsValidatingSession(false);
        // Redirect handled by ensureUserContext
        return;
      }

      console.log('[ReportIssueScreen] Issue reporting uses auth as identity source');

      // Get user ID from auth ONLY - single source of truth
      if (!auth) {
        setError('Not authenticated. Please log in again.');
        setIsValidatingSession(false);
        return;
      }

      if (!equipmentId || !category || !location) {
        setError('Equipment ID, category, and location are required.');
        setIsValidatingSession(false);
        return;
      }

      setIsValidatingSession(false);

      const timestamp = BigInt(Date.now() * 1000000);
      const issueId = `issue-${Date.now()}`;

      // Use badgeId or user from auth
      const operatorId = auth.badgeId || auth.user;

      let photoBlob: ExternalBlob | undefined;
      if (photoFile) {
        const arrayBuffer = await photoFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        photoBlob = ExternalBlob.fromBytes(uint8Array);
      }

      // If grounded, update local registry status with history
      if (grounded) {
        updateEquipmentStatus(equipmentId, 'MAINTENANCE', operatorId, location, `${category}: ${notes}`);
      }

      // Log event to in-memory history
      logEvent({
        id: `event-${Date.now()}`,
        equipmentId,
        eventType: 'REPORT_ISSUE',
        operator: operatorId,
        timestamp: new Date().toISOString(),
        location,
        notes: `${category}: ${notes}${grounded ? ' (GROUNDED)' : ''}`,
      });

      // Report issue
      await reportIssue.mutateAsync({
        id: issueId,
        equipment_id: equipmentId,
        category,
        location,
        photo: photoBlob,
        grounded,
        notes,
        operator_id: operatorId,
        timestamp,
        status: 'open',
      });

      // If grounded, update equipment status in backend
      if (grounded) {
        await updateEquipment.mutateAsync({
          id: equipmentId,
          name: equipment?.name || equipmentId,
          status: 'maintenance',
          assigned_operator: equipment?.assigned_operator,
          last_location: location,
          last_update_time: timestamp,
        });
      }

      // Log activity
      await logActivity.mutateAsync({
        id: `activity-${Date.now()}`,
        action: 'report_issue',
        user_id: operatorId,
        timestamp,
        details: `Reported ${category} issue for equipment ${equipmentId}${grounded ? ' (GROUNDED)' : ''}`,
      });

      setStep('success');
    } catch (err: any) {
      console.error('Report issue error:', err);
      setError(err.message || 'Failed to report issue. Please try again.');
      setIsValidatingSession(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setEquipmentId('');
    setRawScanValue('');
    setCategory('');
    setNotes('');
    setLocation('');
    setGpsLocation('');
    setGrounded(false);
    setPhotoFile(null);
    setPhotoPreview('');
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
    return <EquipmentQRScanner mode="equipment" title="Scan Equipment to Report Issue" onScan={handleScan} onClose={handleCloseScanner} />;
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
        <header className="bg-destructive/95 backdrop-blur-sm text-destructive-foreground shadow-lg">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={onBack}>
              ← Back to Agent Menu
            </Button>
            <h1 className="text-2xl font-bold">Report Issue</h1>
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
                  <CardTitle style={{ color: '#ffffff' }}>Report Equipment Issue</CardTitle>
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

            {step === 'details' && (
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
                  <CardTitle style={{ color: '#ffffff' }}>Issue Details</CardTitle>
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
                    <Label htmlFor="category" style={{ color: '#cbd5f5' }}>
                      Issue Category *
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category" className="mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mechanical">Mechanical</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location" style={{ color: '#cbd5f5' }}>
                      Location *
                    </Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter location"
                        className="flex-1"
                      />
                      <Button onClick={captureGPS} variant="outline">
                        Get GPS
                      </Button>
                    </div>
                    {gpsLocation && (
                      <p className="text-sm mt-1" style={{ color: '#cbd5f5' }}>
                        GPS: {gpsLocation}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes" style={{ color: '#cbd5f5' }}>
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the issue..."
                      className="mt-2"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <div>
                      <Label htmlFor="grounded" className="font-semibold" style={{ color: '#ffffff' }}>
                        Ground Equipment
                      </Label>
                      <p className="text-sm mt-1" style={{ color: '#cbd5f5' }}>
                        Mark equipment as out of service
                      </p>
                    </div>
                    <Switch id="grounded" checked={grounded} onCheckedChange={setGrounded} />
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
                    <Button onClick={() => setStep('photo')} disabled={!category || !location} className="flex-1">
                      Next: Add Photo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'photo' && (
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
                  <CardTitle style={{ color: '#ffffff' }}>Add Photo (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!photoPreview && !cameraActive && (
                    <Button onClick={startCamera} disabled={cameraLoading} className="w-full">
                      {cameraLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting Camera...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Take Photo
                        </>
                      )}
                    </Button>
                  )}

                  {cameraActive && !photoPreview && (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden bg-black">
                        <video ref={cameraVideoRef} className="w-full h-auto" playsInline muted autoPlay />
                      </div>
                      <canvas ref={cameraCanvasRef} style={{ display: 'none' }} />
                      <div className="flex gap-2">
                        <Button onClick={stopCamera} variant="outline" className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleTakePhoto} className="flex-1">
                          <Camera className="mr-2 h-4 w-4" />
                          Capture
                        </Button>
                      </div>
                    </div>
                  )}

                  {photoPreview && (
                    <div className="space-y-4">
                      <img src={photoPreview} alt="Issue photo" className="w-full rounded-lg" />
                      <Button
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview('');
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Retake Photo
                      </Button>
                    </div>
                  )}

                  {cameraError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription style={{ color: '#cbd5f5' }}>{cameraError.message}</AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription style={{ color: '#cbd5f5' }}>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => setStep('details')} variant="outline" className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={reportIssue.isPending || isValidatingSession} className="flex-1">
                      {isValidatingSession ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reconnecting...
                        </>
                      ) : reportIssue.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Report'
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
                    Issue Reported!
                  </h2>
                  <p style={{ color: '#cbd5f5' }}>
                    Issue for equipment {equipmentId} has been reported.
                    {grounded && <span className="block mt-2 font-semibold text-red-400">Equipment has been grounded.</span>}
                  </p>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleReset} variant="outline" className="flex-1">
                      Report Another
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
