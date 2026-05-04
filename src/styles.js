// =============================================================================
// GlasStation — Stilar
// =============================================================================
// Alla CSS-in-JS-stilar samlade på ett ställe.
// Appen är optimerad för iPhone-skärmar (max-width 430px).
// Färgpaletten är mörkt tema med blå, lila och orange accentfärger per robot.
// =============================================================================

export const S = {
  // ── Layout ──────────────────────────────────────────────────────────────
  container: {
    minHeight: "100vh",
    background: "#08080d",
    color: "#e8e8e8",
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    WebkitFontSmoothing: "antialiased",
    maxWidth: 430,
    margin: "0 auto",
    position: "relative",
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "56px 20px 14px",
    borderBottom: "1px solid #151520",
  },
  headerLeft:  { display: "flex", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: "#555", marginTop: 1 },
  logo: {
    width: 36, height: 36,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 800, letterSpacing: 1, color: "#fff",
  },

  // ── Live-statusbadge (uppe till höger) ──────────────────────────────────
  liveBadge: {
    display: "flex", alignItems: "center", gap: 6,
    border: "1px solid", borderRadius: 20, padding: "5px 12px",
  },
  liveDot:   { width: 7, height: 7, borderRadius: "50%", animation: "pulse 2s ease-in-out infinite" },
  liveLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5 },

  // ── Toast-notifikationer ─────────────────────────────────────────────────
  toastContainer: {
    position: "fixed", top: 50, left: 0, right: 0, zIndex: 100,
    padding: "8px 12px", maxWidth: 430, margin: "0 auto",
    display: "flex", flexDirection: "column", gap: 8,
  },
  toast: {
    background: "#111118ee", backdropFilter: "blur(20px)",
    borderRadius: 14, padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
    boxShadow: "0 8px 32px #00000088", cursor: "pointer",
    animation: "slideIn 0.3s ease-out",
  },
  toastTitle: { fontSize: 14, fontWeight: 700, color: "#fff" },
  toastMeta:  { fontSize: 12, color: "#22c55e", marginTop: 2 },

  // ── Statistikrader (par totalt, ställ klara, utskriftsläge) ─────────────
  statsRow: { display: "flex", gap: 8, padding: "14px 20px" },
  statCard: {
    flex: 1, background: "#0e0e15", border: "1px solid #1a1a25",
    borderRadius: 14, padding: "12px 10px", textAlign: "center",
  },
  statVal: { fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -1, fontVariantNumeric: "tabular-nums" },
  statLbl: { fontSize: 10, color: "#555", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.8 },

  // ── Kampanjrad ───────────────────────────────────────────────────────────
  campaignBar: {
    margin: "0 20px 4px", padding: "12px 16px",
    background: "#0e0e15", border: "1px solid #1a1a25", borderRadius: 14,
  },
  campRow:    { display: "flex", justifyContent: "space-between", alignItems: "center" },
  campLabel:  { fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 },
  campValue:  { fontSize: 18, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" },

  // ── Sektionsrubriker ────────────────────────────────────────────────────
  sectionTitle: {
    padding: "16px 20px 10px",
    fontSize: 12, fontWeight: 700, color: "#555",
    textTransform: "uppercase", letterSpacing: 1,
  },

  // ── Robotkort ────────────────────────────────────────────────────────────
  robotCard: {
    margin: "0 20px 10px", padding: "16px",
    border: "1px solid", borderRadius: 18, cursor: "pointer",
  },
  robotHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  robotNameRow: { display: "flex", alignItems: "center", gap: 8 },
  robotDot:     { width: 10, height: 10, borderRadius: "50%" },
  robotName:    { fontSize: 17, fontWeight: 700, color: "#fff" },
  robotRack:    { fontSize: 13, color: "#6b7280", fontFamily: "monospace" },
  robotFooter:  { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 },

  // ── Statusbadges ─────────────────────────────────────────────────────────
  runBadge: {
    fontSize: 11, color: "#6b7280",
    background: "#1a1a25", borderRadius: 6, padding: "2px 8px",
  },
  stallBadge: {
    fontSize: 10, fontWeight: 800, color: "#ef4444",
    background: "#2a0606", border: "1px solid #ef444444",
    borderRadius: 6, padding: "2px 8px", letterSpacing: 1,
  },

  // ── Progressbar ──────────────────────────────────────────────────────────
  progressBg:   { height: 8, background: "#1a1a25", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, transition: "width 0.8s ease-out" },

  // ── Knappar ──────────────────────────────────────────────────────────────
  manualBtn: {
    width: "100%", marginTop: 10, padding: "11px",
    background: "transparent", border: "1px dashed",
    borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "center",
  },
  logBtn: {
    display: "flex", alignItems: "center",
    width: "calc(100% - 40px)", margin: "8px 20px", padding: "14px 16px",
    background: "#0e0e15", border: "1px solid #1a1a25", borderRadius: 14,
    cursor: "pointer", color: "#e8e8e8", fontSize: 15, gap: 10,
  },
  dialogBtn: {
    padding: "14px", borderRadius: 12, border: "none",
    fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "center",
  },

  // ── Auto-print-toggle ────────────────────────────────────────────────────
  toggleRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    margin: "8px 20px", padding: "14px 16px",
    background: "#0e0e15", border: "1px solid #1a1a25", borderRadius: 14,
  },
  toggleSwitch: {
    width: 52, height: 30, borderRadius: 15, border: "none",
    cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
  },
  toggleKnob: {
    width: 26, height: 26, borderRadius: 13, background: "#fff",
    position: "absolute", top: 2, transition: "transform 0.2s",
    boxShadow: "0 2px 4px #00000044",
  },

  // ── Subvyer (Tillbaka-header) ────────────────────────────────────────────
  subHeader: {
    display: "flex", alignItems: "center",
    padding: "56px 20px 14px", borderBottom: "1px solid #151520", gap: 12,
  },
  backBtn:  { background: "none", border: "none", color: "#2563eb", fontSize: 16, fontWeight: 600, cursor: "pointer", padding: "4px 0" },
  subTitle: { fontSize: 18, fontWeight: 700, color: "#fff" },

  // ── Detaljvy ─────────────────────────────────────────────────────────────
  detailHero: { padding: "30px 20px", textAlign: "center", borderBottom: "1px solid #151520" },

  // ── Logg / filterchips ───────────────────────────────────────────────────
  filterRow:    { display: "flex", gap: 8, padding: "12px 20px", overflowX: "auto" },
  filterChip:   { padding: "7px 16px", borderRadius: 20, border: "1px solid #1a1a25", background: "#0e0e15", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  filterActive: { borderColor: "#2563eb", color: "#2563eb", background: "#0c1a3d" },
  logEntry:     { display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #111118", gap: 12 },
  logNum:       { width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  logRack:      { fontSize: 15, fontWeight: 700, color: "#fff" },
  logMeta:      { fontSize: 12, color: "#555", marginTop: 2 },

  // ── Logg-badges (AUTO = grön, MANUELL = gul) ─────────────────────────────
  autoBadge: {
    fontSize: 9, fontWeight: 800, color: "#22c55e",
    background: "#0a2a0a", border: "1px solid #22c55e33",
    borderRadius: 5, padding: "2px 6px", letterSpacing: 1, flexShrink: 0,
  },
  manualBadge: {
    fontSize: 9, fontWeight: 800, color: "#f59e0b",
    background: "#1a1506", border: "1px solid #f59e0b33",
    borderRadius: 5, padding: "2px 6px", letterSpacing: 1, flexShrink: 0,
  },

  // ── Tom lista ────────────────────────────────────────────────────────────
  emptyState: { textAlign: "center", padding: "50px 20px", color: "#555", fontSize: 14 },

  // ── Kampanjbyte — bekräftelsedialog ──────────────────────────────────────
  confirmOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "#000000cc", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 20,
  },
  confirmDialog: {
    background: "#111118", border: "1px solid #1a1a25",
    borderRadius: 20, padding: "24px", maxWidth: 360, width: "100%",
  },

  // ── Systemvy ─────────────────────────────────────────────────────────────
  connCard: { padding: "16px", background: "#0e0e15", border: "1px solid", borderRadius: 14, marginBottom: 10 },
  kvList:   { margin: "0 20px", background: "#0e0e15", border: "1px solid #1a1a25", borderRadius: 12, overflow: "hidden" },
};

// Globala CSS-animationer — injiceras i <head> vid appstart.
export const injectGlobalStyles = () => {
  const sheet = document.createElement("style");
  sheet.textContent = `
    @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    @keyframes slideIn  { from { transform:translateY(-20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
    @keyframes flashGreen {
      0%   { box-shadow: 0 0 0 0   #22c55e44; }
      50%  { box-shadow: 0 0 0 8px #22c55e22; }
      100% { box-shadow: 0 0 0 0   #22c55e00; }
    }
    button:active { transform: scale(0.97); }
    * { -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(sheet);
};
