// =============================================================================
// GlasStation — Konfiguration
// =============================================================================
// Samlad plats för all konfiguration, robotdefinitioner och kampanjdata.
// Ändra CONFIG-objektet för att växla mellan demo-, mock- och produktionsläge.
// Kampanjdata och robotar uppdateras här utan att röra applikationslogiken.
// =============================================================================

// ─── APPKONFIGURATION ────────────────────────────────────────────────────────
export const CONFIG = {
  // API-adress till er backend-gateway. Sätts av IT när backend är klar.
  API_BASE: null, // t.ex. "https://mes-gw.sekurit.local/api/v1"

  // WebSocket-adress för realtidsdata från robotarna (ABB IRC5 via OPC-UA).
  WS_URL: null, // t.ex. "wss://mes-gw.sekurit.local/ws/robots"

  // MOCK_MODE: true = appen kör med simulerad data (inget backend behövs).
  // Sätt till false när IT har kopplat backend-endpoints.
  MOCK_MODE: true,

  // DEMO_MODE: true = snabbare simulering för presentation och demo.
  // Sätt till false i produktion för realistisk takt.
  DEMO_MODE: true,

  // Plant och linjeidentifikation — matchar CDM 2000.
  PLANT:   "310",
  LINE:    "4208",
  STATION: "GLAS-PACK-01",

  // Uppdateringsfrekvens för mocksimulatorn (ms).
  // Demo: 600ms för synlig animation. Produktion: 2000ms.
  POLL_INTERVAL_MS: 600,

  // Sekunder utan räknaruppdatering innan en robot markeras som "INGEN DATA".
  STALL_TIMEOUT_S: 30,
};

// ─── ROBOTDEFINITIONER ───────────────────────────────────────────────────────
// Tre ABB IRC5-robotar på packningslinjen.
// OPC-UA-taggar exponeras via option 616-1 (PC Interface) på IRC5-kontrollern.
// Robotprogrammeraren lägger till PERS-variabler i RAPID-koden:
//   PERS num    gs_packCount := 0;   // Antal packade enkelglas i aktivt ställ
//   PERS string gs_rackId    := "";  // Aktivt ställnummer
//   PERS bool   gs_running   := FALSE; // Roboten kör / pausad
// Taggarna läses av gatewayen via OPC-UA och pushas till appen via WebSocket.
export const ROBOTS = [
  {
    id:         "alva",
    name:       "Alva",
    color:      "#2563eb",
    colorLight: "#1e40af",
    bg:         "#0c1a3d",
    plcTags: {
      count:   "ns=1;s=RAPID/T_ROB1/MainModule/gs_packCount",
      rackId:  "ns=1;s=RAPID/T_ROB1/MainModule/gs_rackId",
      running: "ns=1;s=RAPID/T_ROB1/MainModule/gs_running",
    },
  },
  {
    id:         "ylva",
    name:       "Ylva",
    color:      "#9333ea",
    colorLight: "#7e22ce",
    bg:         "#1a0c3d",
    plcTags: {
      count:   "ns=1;s=RAPID/T_ROB1/MainModule/gs_packCount",
      rackId:  "ns=1;s=RAPID/T_ROB1/MainModule/gs_rackId",
      running: "ns=1;s=RAPID/T_ROB1/MainModule/gs_running",
    },
  },
  {
    id:         "olof",
    name:       "Olof",
    color:      "#ea580c",
    colorLight: "#c2410c",
    bg:         "#2d1106",
    plcTags: {
      count:   "ns=1;s=RAPID/T_ROB1/MainModule/gs_packCount",
      rackId:  "ns=1;s=RAPID/T_ROB1/MainModule/gs_rackId",
      running: "ns=1;s=RAPID/T_ROB1/MainModule/gs_running",
    },
  },
];

// ─── KAMPANJDATA (MOCK) ──────────────────────────────────────────────────────
// Används när MOCK_MODE = true. I produktion hämtas kampanjdata från CDM 2000
// via API-gatewayen. Varje kampanjnummer matchar samma kampanjnummer som
// används i WinTerm idag (CDM-systemet är källa för båda).
//
// Ställtyper och prefix:
//   JLR    → AWAS-ställ (framdörrar, 180 enkel / 90 par)
//   Pinta5 → AWC0-ställ (framdörrar, 160 eller 180 enkel)
//   RFU2   → AWAB-ställ (bakdörrar, 120 eller 260 enkel)
//
// pairQty  = antal PAR som skrivs på etiketten (= singleQty / 2)
// singleQty = antal ENKELGLAS som roboten räknar tills stället är fullt
export const MOCK_CAMPAIGNS = {
  "310246108": {
    name:         "Främre dörr höger — JLR",
    product:      "SKOS3165FDR02A-A0",
    material:     "1451786",
    customerPart: "5LA 845 022",
    fi:           "R0P5.--.JLR",
    pairQty:      90,
    singleQty:    180,
    rackName:     "JLR",
    rackPrefix:   "AWAS",
    status:       "A",
    line:         "4208",
  },
  "310246112": {
    name:         "Främre dörr höger — Pinta5 160",
    product:      "SKOS3165FDR02A-A0",
    material:     "1451786",
    customerPart: "5LA 845 022",
    fi:           "R0P5.--.P5",
    pairQty:      80,
    singleQty:    160,
    rackName:     "Pinta5",
    rackPrefix:   "AWC0",
    status:       "A",
    line:         "4208",
  },
  "310246113": {
    name:         "Främre dörr höger — Pinta5 180",
    product:      "SKOS3165FDR02A-A0",
    material:     "1451786",
    customerPart: "5LA 845 022",
    fi:           "R0P5.--.P5",
    pairQty:      90,
    singleQty:    180,
    rackName:     "Pinta5",
    rackPrefix:   "AWC0",
    status:       "A",
    line:         "4208",
  },
  "310246109": {
    name:         "Främre dörr vänster — JLR",
    product:      "SKOS3165FDL02A-A0",
    material:     "1451787",
    customerPart: "5LA 845 021",
    fi:           "R0P5.--.JLR",
    pairQty:      90,
    singleQty:    180,
    rackName:     "JLR",
    rackPrefix:   "AWAS",
    status:       "A",
    line:         "4208",
  },
  "310246114": {
    name:         "Främre dörr vänster — Pinta5 160",
    product:      "SKOS3165FDL02A-A0",
    material:     "1451787",
    customerPart: "5LA 845 021",
    fi:           "R0P5.--.P5",
    pairQty:      80,
    singleQty:    160,
    rackName:     "Pinta5",
    rackPrefix:   "AWC0",
    status:       "A",
    line:         "4208",
  },
  "310246110": {
    name:         "Bakre dörr höger — RFU2 260",
    product:      "SKOS3165RDR01A-A0",
    material:     "1451790",
    customerPart: "5LA 845 026",
    fi:           "R0P5.--.JLR",
    pairQty:      130,
    singleQty:    260,
    rackName:     "RFU2",
    rackPrefix:   "AWAB",
    status:       "A",
    line:         "4208",
  },
  "310246115": {
    name:         "Bakre dörr höger — RFU2 120",
    product:      "SKOS3165RDR01A-A0",
    material:     "1451790",
    customerPart: "5LA 845 026",
    fi:           "R0P5.--.JLR",
    pairQty:      60,
    singleQty:    120,
    rackName:     "RFU2",
    rackPrefix:   "AWAB",
    status:       "A",
    line:         "4208",
  },
  "310246111": {
    name:         "Bakre dörr vänster — RFU2 260",
    product:      "SKOS3165RDL01A-A0",
    material:     "1451791",
    customerPart: "5LA 845 025",
    fi:           "R0P5.--.JLR",
    pairQty:      130,
    singleQty:    260,
    rackName:     "RFU2",
    rackPrefix:   "AWAB",
    status:       "A",
    line:         "4208",
  },
  "310246116": {
    name:         "Bakre dörr vänster — RFU2 120",
    product:      "SKOS3165RDL01A-A0",
    material:     "1451791",
    customerPart: "5LA 845 025",
    fi:           "R0P5.--.JLR",
    pairQty:      60,
    singleQty:    120,
    rackName:     "RFU2",
    rackPrefix:   "AWAB",
    status:       "A",
    line:         "4208",
  },
};
