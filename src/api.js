// =============================================================================
// GlasStation — API-klient
// =============================================================================
// Alla anrop mot CDM 2000, WinTerm och robot-PLC:er är samlade här.
//
// Systemflöde:
//   - WinTerm är applikationen som skriver ut etiketterna idag
//   - CDM 2000 (MES på AS400) hanterar kampanjer och loggar de utskrivna
//     etiketterna efter att WinTerm är klar
//   - Den här appen ersätter operatörens manuella WinTerm-flöde — när ett
//     ställ är fullt triggar appen samma utskrift, och CDM loggar som vanligt.
//
// Varje funktion har ett mock-läge (MOCK_MODE=true) och ett produktionsläge.
// Backend-endpoints som IT behöver implementera finns dokumenterade i
// README_CDM_WINTERM.md och README_IT.md.
// =============================================================================

import { CONFIG, MOCK_CAMPAIGNS } from "./config.js";

export const api = {
  // ---------------------------------------------------------------------------
  // Hämtar aktiv kampanj för denna station.
  // Anropas vid appstart för att synkronisera med CDM 2000.
  // Produktion: GET /campaigns/active
  // ---------------------------------------------------------------------------
  async getActiveCampaign() {
    if (CONFIG.MOCK_MODE) {
      const id = globalThis.__mockActive || "310246108";
      return { campaignId: id, ...MOCK_CAMPAIGNS[id] };
    }
    const r = await fetch(`${CONFIG.API_BASE}/campaigns/active`);
    return r.json();
  },

  // ---------------------------------------------------------------------------
  // Slår upp ett kampanjnummer i CDM 2000.
  // Används när operatören skriver in ett nytt kampanjnummer, precis som
  // i WinTerm-flödet idag.
  // Produktion: GET /campaigns/lookup/:id
  // ---------------------------------------------------------------------------
  async lookupCampaign(id) {
    if (CONFIG.MOCK_MODE) {
      if (!MOCK_CAMPAIGNS[id]) throw new Error("Kampanj hittades inte");
      return { campaignId: id, ...MOCK_CAMPAIGNS[id] };
    }
    const r = await fetch(`${CONFIG.API_BASE}/campaigns/lookup/${id}`);
    if (!r.ok) throw new Error("Kampanj hittades inte");
    return r.json();
  },

  // ---------------------------------------------------------------------------
  // Sätter ny aktiv kampanj i CDM 2000 för denna station.
  // Triggas när operatören bekräftar ett kampanjbyte i appen.
  // Produktion: POST /campaigns/set-active
  // ---------------------------------------------------------------------------
  async setActiveCampaign(id) {
    if (CONFIG.MOCK_MODE) {
      globalThis.__mockActive = id;
      return { ok: true };
    }
    const r = await fetch(`${CONFIG.API_BASE}/campaigns/set-active`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ campaignId: id, station: CONFIG.STATION }),
    });
    return r.json();
  },

  // ---------------------------------------------------------------------------
  // Genererar nästa ställnummer med rätt prefix för aktiv kampanj.
  // CDM tilldelar ställTYP (JLR/Pinta5/RFU2) via kampanjdata — inte numret.
  // Numret genereras lokalt med rätt prefix (AWAS/AWC0/AWAB).
  // ---------------------------------------------------------------------------
  async nextRackId(robotId, campaign) {
    const prefix = MOCK_CAMPAIGNS[campaign]?.rackPrefix || "WAS";
    return { rackId: `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}` };
  },

  // ---------------------------------------------------------------------------
  // Skickar ett print-jobb till WinTerm.
  // WinTerm skriver ut etiketten och CDM loggar den automatiskt efteråt —
  // exakt samma flöde som händer när operatören klickar "Bekräfta" i
  // WinTerm idag, fast nu triggat automatiskt från appen.
  // Produktion: POST /prints/rack
  // ---------------------------------------------------------------------------
  async printRack(payload) {
    const data = {
      ...payload,
      station:   CONFIG.STATION,
      timestamp: new Date().toISOString(),
    };
    if (CONFIG.MOCK_MODE) {
      console.log("[GlasStation MOCK] Print-jobb:", data);
      return { ok: true, printId: `MOCK-${Date.now()}` };
    }
    const r = await fetch(`${CONFIG.API_BASE}/prints/rack`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    return r.json();
  },

  // ---------------------------------------------------------------------------
  // Kontrollerar statusen för alla delsystem.
  // Appen pollar denna endpoint var 10:e sekund och visar resultatet i
  // systemvyn (tryck på statusbadgen uppe till höger).
  // Produktion: GET /health
  // ---------------------------------------------------------------------------
  async health() {
    if (CONFIG.MOCK_MODE) {
      return { cdm: false, winterm: false, robots: false, mock: true };
    }
    try {
      const r = await fetch(`${CONFIG.API_BASE}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return r.json();
    } catch {
      return { cdm: false, winterm: false, robots: false, error: true };
    }
  },
};
