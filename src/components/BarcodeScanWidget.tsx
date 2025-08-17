"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { NotFoundException, Result } from "@zxing/library";

export default function BarcodeScanWidget() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  // List cameras (needs https or localhost)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices) {
          setError("Camera API not available. Use HTTPS or localhost.");
          return;
        }
        // Prompt once so enumerateDevices returns labels on some browsers
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch {
          // ignore; user may deny, we'll still try enumerateDevices
        }
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter((d) => d.kind === "videoinput");
        if (mounted) {
          setDevices(cams);
          if (cams[0]?.deviceId) setDeviceId(cams[0].deviceId);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to list cameras");
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !deviceId || !scanning) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(deviceId, videoRef.current, (res?: Result, err?: unknown, controls?: IScannerControls) => {
      if (controls) controlsRef.current = controls;
      if (res) {
        setResult(res.getText());
        // keep scanning; user can stop manually
      } else if (err && !(err instanceof NotFoundException)) {
        console.error(err);
      }
    });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      readerRef.current = null;
    };
  }, [deviceId, scanning]);

  const start = () => setScanning(true);
  const stop = () => {
    setScanning(false);
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  const decodeFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader();
      const res = await reader.decodeFromImageUrl(url);
      setResult(res.getText());
    } catch (e) {
      setResult("No barcode found in image.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{display: "grid", gap: 12}}>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
        <label>
          Camera
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            style={{width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8}}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </label>

        <div style={{display: "flex", gap: 8, alignItems: "end"}}>
          {!scanning ? (
            <button onClick={start} style={{padding: "8px 12px", border: "1px solid #111827", borderRadius: 8}}>
              Start camera
            </button>
          ) : (
            <button onClick={stop} style={{padding: "8px 12px", border: "1px solid #111827", borderRadius: 8}}>
              Stop camera
            </button>
          )}
        </div>
      </div>

      <video
        ref={videoRef}
        muted
        playsInline
        style={{width: "100%", background: "#000", borderRadius: 8}}
      />

      <div style={{display: "grid", gap: 8}}>
        <label>
          Or scan from image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && decodeFile(e.target.files[0])}
          />
        </label>
      </div>

      <div style={{border: "1px solid #e5e7eb", borderRadius: 8, padding: 12}}>
        <strong>Result:</strong>
        <div style={{marginTop: 6, wordBreak: "break-all"}}>{result || "—"}</div>
        {error && <div style={{marginTop: 6, color: "#b91c1c"}}>{error}</div>}
      </div>

      <p style={{fontSize: 12, color: "#6b7280"}}>
        Tip: Camera access requires HTTPS (or <code>http://localhost</code>). Good lighting helps.
      </p>
    </div>
  );
}
