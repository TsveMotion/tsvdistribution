import BarcodeGenerator from "@/components/BarcodeGenerator";
import BarcodeScanWidget from "@/components/BarcodeScanWidget";

export default function Page() {
  return (
    <main style={{maxWidth: 900, margin: "40px auto", padding: 16}}>
      <h1 style={{fontSize: 28, fontWeight: 700, marginBottom: 12}}>
        Barcodes: Generate & Scan
      </h1>

      <section style={{display: "grid", gap: 24}}>
        <div style={{border: "1px solid #e5e7eb", borderRadius: 12, padding: 16}}>
          <h2 style={{fontSize: 20, fontWeight: 600, marginBottom: 8}}>Generator</h2>
          <BarcodeGenerator />
        </div>

        <div style={{border: "1px solid #e5e7eb", borderRadius: 12, padding: 16}}>
          <h2 style={{fontSize: 20, fontWeight: 600, marginBottom: 8}}>Scanner</h2>
          <BarcodeScanWidget />
        </div>
      </section>
    </main>
  );
}
