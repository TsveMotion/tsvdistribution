"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

export default function BarcodeGenerator() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [text, setText] = useState("123456789012");
  const [height, setHeight] = useState(80);
  const [width, setWidth] = useState(2);
  const [margin, setMargin] = useState(10);
  const valid = ""; // Fixed to CODE128, no extra validation needed

  useEffect(() => {
    if (!svgRef.current || !text) return;
    try {
      JsBarcode(svgRef.current, text, {
        format: "CODE128",
        displayValue: true,
        lineColor: "#000000",
        width,
        height,
        margin,
        fontSize: 14,
      });
    } catch {
      // ignore invalid render attempts
    }
  }, [text, width, height, margin]);

  const downloadSVG = () => {
    if (!svgRef.current) return;
    const blob = new Blob([svgRef.current.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CODE128-${text}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{display: "grid", gap: 12}}>
      <div style={{display: "grid", gap: 8}}>
        <label style={{display: "grid", gap: 4}}>
          <span>Data</span>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Enter data to encode"
            style={{width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8}}
          />
        </label>

        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
          <label style={{display: "grid", gap: 4}}>
            <span>Line width</span>
            <input type="number" min={1} max={6} value={width}
              onChange={e => setWidth(Number(e.target.value))}
              style={{width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8}}/>
          </label>
          <label style={{display: "grid", gap: 4}}>
            <span>Height</span>
            <input type="number" min={40} max={200} value={height}
              onChange={e => setHeight(Number(e.target.value))}
              style={{width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8}}/>
          </label>
          <label style={{display: "grid", gap: 4}}>
            <span>Margin</span>
            <input type="number" min={0} max={30} value={margin}
              onChange={e => setMargin(Number(e.target.value))}
              style={{width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8}}/>
          </label>
        </div>
        {valid && <p style={{color: "#b45309"}}>{valid}</p>}
      </div>

      <div style={{background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12}}>
        <svg ref={svgRef} />
      </div>

      <div>
        <button onClick={downloadSVG}
          style={{padding: "8px 12px", border: "1px solid #111827", borderRadius: 8}}>
          Download SVG
        </button>
      </div>
    </div>
  );
}
