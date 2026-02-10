import React, { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { normalizeEquipmentId } from '../lib/equipmentRegistry';
import { parseBadgeId } from '../lib/parseBadge';

interface EquipmentQRScannerProps {
  mode: 'login' | 'equipment';
  title?: string;
  onScan: (decodedValue: string) => void;
  onClose: () => void;
}

// Frozen video component that never re-renders
const StableVideo = React.memo(
  ({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> | null }) => (
    <video
      ref={videoRef as React.RefObject<HTMLVideoElement>}
      className="absolute inset-0 object-cover"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        background: '#000',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
      playsInline
      muted
      autoPlay
    />
  ),
  () => true
);

StableVideo.displayName = 'StableVideo';

// Static overlay component
const StaticOverlay = React.memo(
  ({
    title,
    loadingContainerRef,
    scanningTextRef,
    errorContainerRef,
    torchButtonRef,
    onTorchToggle,
    onCancel,
  }: {
    title: string;
    loadingContainerRef: React.RefObject<HTMLDivElement | null>;
    scanningTextRef: React.RefObject<HTMLDivElement | null>;
    errorContainerRef: React.RefObject<HTMLDivElement | null>;
    torchButtonRef: React.RefObject<HTMLButtonElement | null>;
    onTorchToggle: () => void;
    onCancel: () => void;
  }) => (
    <>
      {/* Orange horizontal guide line */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '100%',
          height: '3px',
          backgroundColor: '#F97316',
          boxShadow: '0 0 12px rgba(249, 115, 22, 0.8)',
          zIndex: 10000,
          willChange: 'transform',
          transform: 'translate(-50%, -50%)',
          position: 'absolute',
          left: '50%',
          top: '50%',
        }}
      />

      {/* UI overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-between p-6"
        style={{
          zIndex: 10001,
          pointerEvents: 'auto',
        }}
      >
        {/* Title and torch button at top */}
        <div className="w-full flex items-center justify-between pt-8">
          <div className="flex-1" />
          <h2 className="text-2xl font-bold text-white drop-shadow-lg text-center flex-1">
            {title}
          </h2>
          <div className="flex-1 flex justify-end">
            <button
              ref={torchButtonRef}
              onClick={onTorchToggle}
              className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9"
              style={{ display: 'none' }}
            >
              <span data-torch-icon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Loading indicator */}
        <div ref={loadingContainerRef} className="flex flex-col items-center" style={{ display: 'flex' }}>
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-white mb-4 drop-shadow-lg" />
          <p className="text-white text-lg drop-shadow-lg">Initializing camera...</p>
        </div>

        {/* Scanning indicator */}
        <div ref={scanningTextRef} className="text-center" style={{ display: 'none' }}>
          <p className="text-white text-lg drop-shadow-lg">
            Position code within the orange guide line
          </p>
        </div>

        {/* Error message */}
        <div ref={errorContainerRef} className="w-full max-w-md" style={{ display: 'none' }}>
          <div className="relative w-full rounded-lg border p-4 bg-red-900/90 border-red-700 text-red-50">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm" data-error-text>
                  Error message
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel button at bottom center */}
        <div className="w-full max-w-md pb-8">
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm py-6 text-lg font-semibold"
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  ),
  () => true
);

StaticOverlay.displayName = 'StaticOverlay';

function EquipmentQRScannerComponent({
  mode,
  title,
  onScan,
  onClose,
}: EquipmentQRScannerProps) {
  // All state in refs - zero React state updates during scanning
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const decodeLoopRef = useRef<number | null>(null);
  const scanLockedRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef<boolean>(true);
  const lastScannedRef = useRef<{ badgeId: string; timestamp: number } | null>(null);

  // Internal state refs
  const isLoadingRef = useRef<boolean>(true);
  const errorRef = useRef<string>('');
  const torchSupportedRef = useRef<boolean>(false);
  const torchOnRef = useRef<boolean>(false);

  // UI element refs for direct DOM manipulation
  const loadingContainerRef = useRef<HTMLDivElement>(null);
  const scanningTextRef = useRef<HTMLDivElement>(null);
  const errorContainerRef = useRef<HTMLDivElement>(null);
  const torchButtonRef = useRef<HTMLButtonElement>(null);

  const defaultTitle = mode === 'login' ? 'Scan Badge to Sign In' : 'Scan Equipment';
  const displayTitle = title || defaultTitle;

  // Update UI via direct DOM manipulation
  const updateUI = useCallback(() => {
    if (loadingContainerRef.current) {
      loadingContainerRef.current.style.display = isLoadingRef.current ? 'flex' : 'none';
    }
    if (scanningTextRef.current) {
      scanningTextRef.current.style.display = !isLoadingRef.current && !errorRef.current ? 'block' : 'none';
    }
    if (errorContainerRef.current) {
      errorContainerRef.current.style.display = errorRef.current ? 'block' : 'none';
      const alertDesc = errorContainerRef.current.querySelector('[data-error-text]');
      if (alertDesc) {
        alertDesc.textContent = errorRef.current;
      }
    }
    if (torchButtonRef.current) {
      torchButtonRef.current.style.display = torchSupportedRef.current ? 'flex' : 'none';
      const iconContainer = torchButtonRef.current.querySelector('[data-torch-icon]');
      if (iconContainer) {
        iconContainer.innerHTML = torchOnRef.current
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6l3 7H6l3-7Z"/><path d="M12 9v13"/><path d="M9 22h6"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6l3 7H6l3-7Z"/><path d="M12 9v13"/><path d="M9 22h6"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';
      }
    }
  }, []);

  // Audio feedback
  const playBeep = useCallback(() => {
    try {
      const audio = new Audio('/assets/generated/scan-success.dim_1024x1024.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
      });
    } catch (err) {
      console.error('[EquipmentQRScanner] Beep error:', err);
    }
  }, []);

  const vibrate = useCallback(() => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch (err) {
      console.error('[EquipmentQRScanner] Vibrate error:', err);
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[EquipmentQRScanner] Cleaning up...');

    // Stop decode loop
    if (decodeLoopRef.current !== null) {
      cancelAnimationFrame(decodeLoopRef.current);
      decodeLoopRef.current = null;
    }

    // Disable torch before stopping
    if (torchOnRef.current && streamRef.current) {
      try {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        videoTrack
          .applyConstraints({
            advanced: [{ torch: false } as any],
          })
          .catch(() => {});
      } catch (err) {
        console.error('[EquipmentQRScanner] Error disabling torch:', err);
      }
    }

    // Reset reader
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (err) {
        console.error('[EquipmentQRScanner] Error resetting reader:', err);
      }
    }

    // Stop all camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('[EquipmentQRScanner] Track stopped:', track.kind);
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    torchOnRef.current = false;
  }, []);

  // Scan success handler
  const handleScanSuccess = useCallback(
    (rawText: string) => {
      console.log('[SCAN] raw=' + rawText);

      if (mode === 'login') {
        // Use parseBadgeId helper to extract badge ID
        const badgeId = parseBadgeId(rawText);
        
        console.log('[SCAN] parsed=' + badgeId);

        if (!badgeId) {
          console.log('[EquipmentQRScanner] Badge not recognized');
          errorRef.current = 'Badge not recognized';
          updateUI();
          // Reset after 2 seconds to allow retry
          setTimeout(() => {
            if (mountedRef.current) {
              errorRef.current = '';
              updateUI();
              scanLockedRef.current = false;
            }
          }, 2000);
          return;
        }

        // Prevent double-firing by ignoring same badgeId within 2 seconds
        const now = Date.now();
        if (lastScannedRef.current && 
            lastScannedRef.current.badgeId === badgeId && 
            now - lastScannedRef.current.timestamp < 2000) {
          console.log('[SCAN] Ignoring duplicate scan within 2 seconds');
          scanLockedRef.current = false;
          return;
        }

        // Update last scanned
        lastScannedRef.current = { badgeId, timestamp: now };

        console.log('[SCAN] triggering login for badgeId=' + badgeId);

        // Play feedback immediately
        playBeep();
        vibrate();

        // Immediate cleanup and routing
        cleanup();
        onScan(badgeId);
      } else {
        // Equipment scanning mode: normalize and forward to parent
        const normalizedId = normalizeEquipmentId(rawText);
        
        if (!normalizedId) {
          console.log('[EquipmentQRScanner] No valid equipment ID found, ignoring scan');
          scanLockedRef.current = false;
          return;
        }

        console.log('[EquipmentQRScanner] Normalized equipment ID:', normalizedId);

        // Play feedback immediately
        playBeep();
        vibrate();

        cleanup();
        onScan(normalizedId);
      }
    },
    [mode, onScan, cleanup, playBeep, vibrate, updateUI]
  );

  // Manual decode loop using canvas and decodeFromCanvas
  const startManualDecodeLoop = useCallback(() => {
    if (!readerRef.current || !videoRef.current || !canvasRef.current || !mountedRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      console.error('[EquipmentQRScanner] Failed to get canvas context');
      return;
    }

    console.log('[EquipmentQRScanner] Starting manual decode loop with decodeFromCanvas...');

    const decode = () => {
      if (!mountedRef.current || scanLockedRef.current) {
        return;
      }

      try {
        // Check if video is ready
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const width = video.videoWidth;
          const height = video.videoHeight;

          // Set canvas size to match video
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, width, height);

          // Decode using ZXing's decodeFromCanvas method
          try {
            const result = readerRef.current.decodeFromCanvas(canvas);
            if (result && result.text && !scanLockedRef.current) {
              scanLockedRef.current = true;
              handleScanSuccess(result.text);
              return; // Stop loop after successful scan
            }
          } catch (err: any) {
            // NotFoundException is expected when no code is found
            if (err.name !== 'NotFoundException') {
              console.error('[EquipmentQRScanner] Decode error:', err.name, err.message);
            }
          }
        }
      } catch (err) {
        console.error('[EquipmentQRScanner] Frame processing error:', err);
      }

      // Continue loop
      if (mountedRef.current) {
        decodeLoopRef.current = requestAnimationFrame(decode);
      }
    };

    // Start the loop
    decode();
  }, [handleScanSuccess]);

  // Initialize scanner - runs once on mount
  useEffect(() => {
    mountedRef.current = true;
    console.log('[EquipmentQRScanner] Component mounted, initializing scanner...');

    const initializeScanner = async () => {
      try {
        // Load ZXing Browser if not already loaded
        if (typeof (window as any).ZXingBrowser === 'undefined') {
          console.log('[EquipmentQRScanner] Loading ZXing Browser from CDN...');
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@zxing/browser@0.1.1';
            script.async = true;
            script.onload = () => {
              console.log('[EquipmentQRScanner] ZXing Browser loaded successfully');
              resolve();
            };
            script.onerror = () => reject(new Error('Failed to load ZXing Browser'));
            document.head.appendChild(script);
          });
        }

        if (!(window as any).ZXingBrowser) {
          throw new Error('ZXing Browser library not available');
        }

        const { BrowserMultiFormatReader } = (window as any).ZXingBrowser;

        // Initialize reader with multi-format support
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        console.log('[EquipmentQRScanner] ZXing Browser reader initialized with multi-format support');

        // Create canvas for manual decode
        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;
        console.log('[EquipmentQRScanner] Canvas created for manual decode');

        // SINGLE getUserMedia CALL - Request camera access
        console.log('[EquipmentQRScanner] Requesting camera access...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!mountedRef.current) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        console.log('[EquipmentQRScanner] Camera access granted');
        streamRef.current = mediaStream;

        // Check for torch support
        const videoTrack = mediaStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities?.() as any;
        if (capabilities && capabilities.torch) {
          torchSupportedRef.current = true;
          console.log('[EquipmentQRScanner] Torch supported');
        }

        // SINGLE srcObject SET - Attach stream to video element ONCE
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;

          // Wait for video to be ready
          videoRef.current.onloadedmetadata = async () => {
            if (!mountedRef.current || !videoRef.current) return;

            console.log('[EquipmentQRScanner] Video metadata loaded');

            try {
              await videoRef.current.play();
              console.log('[EquipmentQRScanner] Video playing - stable preview active');
              isLoadingRef.current = false;
              updateUI();

              // Start manual decode loop with decodeFromCanvas
              startManualDecodeLoop();
            } catch (err) {
              console.error('[EquipmentQRScanner] Video play error:', err);
              errorRef.current = 'Failed to start video preview';
              isLoadingRef.current = false;
              updateUI();
            }
          };
        }
      } catch (err: any) {
        console.error('[EquipmentQRScanner] Initialization error:', err);
        isLoadingRef.current = false;

        if (err.name === 'NotAllowedError') {
          errorRef.current = 'Camera access is required to scan codes. Please enable camera permissions.';
        } else if (err.name === 'NotFoundError') {
          errorRef.current = 'No camera found on this device.';
        } else {
          errorRef.current = 'Unable to access camera. Please try again.';
        }
        updateUI();
      }
    };

    initializeScanner();

    // Cleanup only on unmount
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup, updateUI, startManualDecodeLoop]);

  // Flashlight toggle
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupportedRef.current) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const newTorchState = !torchOnRef.current;
      
      await videoTrack.applyConstraints({
        advanced: [{ torch: newTorchState } as any],
      });
      
      torchOnRef.current = newTorchState;
      updateUI();
      console.log('[EquipmentQRScanner] Torch toggled:', newTorchState);
    } catch (err) {
      console.error('[EquipmentQRScanner] Torch toggle error:', err);
    }
  }, [updateUI]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgb(0, 0, 0)',
        zIndex: 9999,
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* Stable video component that never re-renders */}
      <StableVideo videoRef={videoRef} />

      {/* Static overlay that never re-renders */}
      <StaticOverlay
        title={displayTitle}
        loadingContainerRef={loadingContainerRef}
        scanningTextRef={scanningTextRef}
        errorContainerRef={errorContainerRef}
        torchButtonRef={torchButtonRef}
        onTorchToggle={toggleTorch}
        onCancel={handleCancel}
      />
    </div>
  );
}

// React.memo with custom comparison - freeze scanner subtree
export default React.memo(EquipmentQRScannerComponent, (prevProps, nextProps) => {
  if (prevProps.mode !== nextProps.mode || prevProps.title !== nextProps.title) {
    return false;
  }
  return true;
});
