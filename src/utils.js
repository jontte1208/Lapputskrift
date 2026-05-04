// =============================================================================
// GlasStation — Hjälpfunktioner
// =============================================================================

// Genererar ett unikt ID — används för loggposter och notifikationer.
export const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Formaterar ett Date-objekt som HH:MM:SS i svensk tidszon.
export const fmtTime = (d) =>
  d.toLocaleTimeString("sv-SE", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// Formaterar ett Date-objekt som ÅÅÅÅ-MM-DD i svensk tidszon.
export const fmtDate = (d) => d.toLocaleDateString("sv-SE");

// Triggar haptisk feedback på enheter som stödjer det (t.ex. iPhone).
// style: "light" = kort vibration, "heavy" = kraftigare vibration.
export const haptic = (style = "light") => {
  if (navigator.vibrate) {
    navigator.vibrate(style === "heavy" ? 40 : 10);
  }
};
