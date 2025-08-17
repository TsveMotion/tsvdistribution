'use client';

import React, { useRef, useEffect, useState } from 'react';
import { XMarkIcon, CameraIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { BarcodeFormat, DecodeHintType, BinaryBitmap, HybridBinarizer, RGBLuminanceSource, NotFoundException, MultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  title?: string;
}

export default function BarcodeScanner({ isOpen, onClose, onScan, title = "Scan Barcode" }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const readerRef = useRef<MultiFormatReader | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      // Optimistically hide the overlay; will show error if camera fails
      setHasPermission(true);

      // Runtime guards: only proceed if camera APIs are available
      if (typeof navigator === 'undefined' || typeof window === 'undefined') {
        setHasPermission(false);
        setIsScanning(false);
        setError('Camera API is not available in this environment.');
        return;
      }
      const insecure = (window as any).isSecureContext === false && window.location.hostname !== 'localhost';
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        setIsScanning(false);
        setError(insecure
          ? 'Camera requires HTTPS or localhost. Open the app on https:// (e.g., via ngrok) or use http://localhost:3000.'
          : 'Camera API not supported by this browser/device. Try a different browser or device.');
        return;
      }

      if (!readerRef.current) {
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE,
        ]);
        const reader = new MultiFormatReader();
        reader.setHints(hints);
        readerRef.current = reader;
      }

      // Ensure the video element is mounted before using it
      const ensureVideo = async () => {
        if (videoRef.current) return;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (!videoRef.current) {
          // As a last resort, wait a tick more
          await new Promise((r) => setTimeout(r, 0));
        }
      };
      await ensureVideo();

      // Prefer back camera on mobile
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      // Start stream manually to eliminate play race conditions
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Video element missing');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setHasPermission(true);

      // ROI decode loop: try both barcode-optimized (2:1) and QR-optimized (square) crops
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas not supported');

      const startTime = Date.now();
      let frameCount = 0;

      const tryDecode = (sx: number, sy: number, sw: number, sh: number) => {
        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(video!, sx, sy, sw, sh, 0, 0, sw, sh);
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const luminance = new RGBLuminanceSource(imgData.data, sw, sh);
        const binarizer = new HybridBinarizer(luminance);
        const bitmap = new BinaryBitmap(binarizer);
        return readerRef.current!.decode(bitmap);
      };

      const scanLoop = () => {
        if (!isScanning || !video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(scanLoop);
          return;
        }
        const vw = video.videoWidth || 1280;
        const vh = video.videoHeight || 720;

        try {
          // 1) 1D barcode ROI (2:1)
          const bw = Math.floor(vw * 0.7);
          const bh = Math.floor(bw / 2);
          const bx = Math.floor((vw - bw) / 2);
          const by = Math.floor((vh - bh) / 2);
          let result = tryDecode(bx, by, bw, bh);
          if (!result) {
            // 2) QR ROI (square ~60% of min dimension)
            const side = Math.floor(Math.min(vw, vh) * 0.6);
            const qx = Math.floor((vw - side) / 2);
            const qy = Math.floor((vh - side) / 2);
            result = tryDecode(qx, qy, side, side);
          }
          if (!result && frameCount % 12 === 0) {
            // 3) Periodic full-frame attempt (every ~12 frames)
            result = tryDecode(0, 0, vw, vh);
          }
          if (result) {
            onScan(result.getText());
            stopCamera();
            onClose();
            return;
          }
        } catch (e) {
          // Normal: NotFound thrown on most frames
          if (!(e instanceof NotFoundException)) {
            // Unexpected error: log once per second
            if (Date.now() - startTime > 1000) console.warn('Decode error:', e);
          }
        }

        frameCount++;
        // Timeout after 15s to provide feedback
        if (Date.now() - startTime > 15000) {
          setError('Could not detect a CODE128 barcode. Try moving closer, increasing brightness, or print the sheet.');
          setIsScanning(false);
          return;
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      };
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setHasPermission(false);
      setError('Unable to access camera. Please check permissions and reload the page.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = streamRef.current;
      stream?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    } catch {}
    setIsScanning(false);
  };
  // ZXing handles decoding directly from the video stream; no manual canvas processing needed.

  const handleManualInput = (input: string) => {
    if (input.trim()) {
      onScan(input.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 shadow-2xl rounded-3xl w-full max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-750 to-slate-800 border-b border-slate-600/50 rounded-t-3xl px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <QrCodeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {title}
                </h2>
                <p className="text-slate-400">Point camera at barcode or enter manually</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-400">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Camera Section */}
          <div className="relative">
            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-600/50 relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-32 border-2 border-cyan-400 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-cyan-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-cyan-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-cyan-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-cyan-400 rounded-br-lg"></div>
                    
                    {/* Scanning line animation */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}

              {!hasPermission && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <CameraIcon className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                    <p className="text-lg font-medium">Camera Access Required</p>
                    <p className="text-sm">Enable camera permissions to scan barcodes</p>
                    <button
                      onClick={startCamera}
                      className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                      Enable Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* No canvas needed; decoding is handled by ZXing directly from the video */}
          </div>

          {/* Manual Input Section */}
          <div className="border-t border-slate-600/50 pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Manual Entry</h3>
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Enter barcode manually..."
                className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualInput((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Enter barcode manually..."]') as HTMLInputElement;
                  if (input) {
                    handleManualInput(input.value);
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-200"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
