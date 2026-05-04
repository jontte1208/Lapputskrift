// =============================================================================
// GlasStation — RackVisual
// =============================================================================
// Visuell representation av ett packningsställ som fylls på i realtid.
// Glasen visas som skivor i ett rutnät (10 kolumner × 5 rader = 50 celler).
// Cellerna fylls nedifrån och upp, proportionellt mot aktuellt antal par.
// Det senast packade glaset glöder svagt i robotens färg.
// =============================================================================

const COLS = 10; // Antal kolumner i stället
const ROWS = 5;  // Antal rader (staplar) per kolumn
const TOTAL = COLS * ROWS; // 50 celler totalt

/**
 * @param {number}  pct       - Fyllnadsgrad i procent (0–100)
 * @param {string}  color     - Robotens accentfärg (hex)
 * @param {number}  pairs     - Aktuellt antal par
 * @param {number}  pairQty   - Maxantal par för detta ställ
 * @param {boolean} isPending - Sant om roboten väntar på ett nytt ställ
 */
export function RackVisual({ pct, color, pairs, pairQty, isPending }) {
  // Visar ett meddelande om roboten väntar på ställ.
  if (isPending) {
    return (
      <div style={{
        margin: "10px 0 8px", padding: "10px 12px",
        background: "#1a1206", border: "1px dashed #f59e0b44",
        borderRadius: 10, textAlign: "center", fontSize: 12, color: "#f59e0b",
      }}>
        Väntar på ställ...
      </div>
    );
  }

  // Antal fyllda celler baserat på fyllnadsgrad.
  const filled = Math.round((pct / 100) * TOTAL);

  return (
    <div style={{ margin: "10px 0 8px" }}>
      <div style={{
        background: "#111118", border: `1px solid ${color}33`,
        borderRadius: 10, padding: "8px 10px", position: "relative",
        overflow: "hidden",
      }}>
        {/* Glasrader — varje kolumn representerar en stapel glas */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 52 }}>
          {Array.from({ length: COLS }).map((_, col) => {
            // Beräkna hur många celler i denna kolumn som är fyllda.
            const colFilled = Math.max(
              0,
              Math.min(
                ROWS,
                Math.floor(filled / COLS) + (col < filled % COLS ? 1 : 0)
              )
            );
            return (
              <div key={col} style={{
                flex: 1, display: "flex", flexDirection: "column",
                justifyContent: "flex-end", gap: 1.5, height: "100%",
              }}>
                {Array.from({ length: ROWS }).map((_, row) => {
                  const isFilled  = row < colFilled;
                  const isNewest  = isFilled && row === colFilled - 1;
                  return (
                    <div key={row} style={{
                      height: 7, borderRadius: 2,
                      background: isFilled
                        ? isNewest ? color : color + "88"
                        : "#1a1a25",
                      transition: "background 0.3s",
                      // Senast packade glaset glöder svagt
                      boxShadow: isNewest ? `0 0 4px ${color}` : "none",
                    }} />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Antal par visas centrerat ovanpå stället */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            fontSize: 18, fontWeight: 900,
            color: pct > 45 ? "#fff" : color,
            textShadow: "0 0 8px #000",
            letterSpacing: -0.5, fontVariantNumeric: "tabular-nums",
          }}>
            {pairs}/{pairQty}
          </div>
        </div>
      </div>
    </div>
  );
}
