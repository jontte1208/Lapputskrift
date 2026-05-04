// =============================================================================
// GlasStation — Systemkomponenter
// =============================================================================

/**
 * StatusRow — visar status för ett delsystem i systemvyn.
 * @param {string}  label - Namn på delsystemet
 * @param {boolean} ok    - Sant om delsystemet svarar
 * @param {boolean} mock  - Sant om appen kör i mock-läge
 */
export function StatusRow({ label, ok, mock }) {
  const color = mock ? "#f59e0b" : ok ? "#22c55e" : "#ef4444";
  const text  = mock ? "MOCK"    : ok ? "OK"      : "OFFLINE";
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "12px 14px",
      background: "#0e0e15", border: "1px solid #1a1a25",
      borderRadius: 12, marginBottom: 8,
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: color, boxShadow: `0 0 6px ${color}88`, marginRight: 12,
      }} />
      <div style={{ flex: 1, fontSize: 14, color: "#e8e8e8" }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: 1 }}>{text}</div>
    </div>
  );
}

/**
 * KV — visar ett nyckel-värde-par i systemvyn (konfigurationstabellen).
 * @param {string} k - Nyckel (vänster)
 * @param {string} v - Värde (höger)
 */
export function KV({ k, v }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "10px 14px", borderBottom: "1px solid #1a1a25",
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{k}</div>
      <div style={{ fontSize: 12, color: "#e8e8e8", fontFamily: "monospace" }}>{v}</div>
    </div>
  );
}
