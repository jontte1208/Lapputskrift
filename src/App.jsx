// =============================================================================
// GlasStation
// =============================================================================
// Mobilapp för realtidsövervakning och automatiserad etiketthantering vid
// packningsrobotarna Alva, Ylva och Olof på linje 4208, Plant 310.
//
// Byggd och underhållen av Jonathan — 3:e man ugnen, linje 4208.
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { CONFIG, ROBOTS, MOCK_CAMPAIGNS }            from "./config.js";
import { api }                                        from "./api.js";
import { genId, fmtTime, fmtDate, haptic }           from "./utils.js";
import { S, injectGlobalStyles }                      from "./styles.js";
import { useRobotFeed }                               from "./hooks/useRobotFeed.js";
import { RackVisual }                                 from "./components/RackVisual.jsx";
import { StatusRow, KV }                              from "./components/SystemComponents.jsx";

// Injicera globala CSS-animationer vid appstart
injectGlobalStyles();

export default function App() {
  // ── Navigation ──────────────────────────────────────────────────────────────
  // view kan vara: "main" | "detail" | "log" | "campaigns" | "source" | "system"
  const [view,            setView]            = useState("main");
  const [detailRobot,     setDetailRobot]     = useState(null);
  const [sourceRobot,     setSourceRobot]     = useState(null);

  // ── Kampanj ─────────────────────────────────────────────────────────────────
  const [campaign,        setCampaign]        = useState("310246108");
  const [campaignData,    setCampaignData]    = useState(MOCK_CAMPAIGNS["310246108"]);
  const [campaignInput,   setCampaignInput]   = useState("");
  const [lookupResult,    setLookupResult]    = useState(null);
  const [lookupStatus,    setLookupStatus]    = useState(null); // null | "loading" | "found" | "notfound"
  const [confirmCampaign, setConfirmCampaign] = useState(null);

  // ── Logg och notifikationer ─────────────────────────────────────────────────
  const [log,             setLog]             = useState([]);
  const [notifications,   setNotifications]   = useState([]);
  const [printFlash,      setPrintFlash]      = useState(null); // Robot-ID som precis skrivit ut

  // ── Inställningar ───────────────────────────────────────────────────────────
  const [autoPrint,       setAutoPrint]       = useState(true);
  const [selectedRobot,   setSelectedRobot]   = useState(null); // Filter i loggvyn
  const [health,          setHealth]          = useState({ cdm: false, winterm: false, robots: false, mock: true });

  // ── Ställkällor per robot ───────────────────────────────────────────────────
  // "auto"   = ställnummer genereras automatiskt med rätt prefix från kampanjen
  // "camera" = kamera läser av streckkod när stället rullar in
  // "manual" = operatören skriver in ställnummer i förväg som en kö
  const [rackSources,     setRackSources]     = useState({ alva: "auto", ylva: "auto", olof: "auto" });
  const [rackQueues,      setRackQueues]      = useState({ alva: [],      ylva: [],      olof: []    });
  const [queueInput,      setQueueInput]      = useState("");

  // Refs så simulatorn alltid har tillgång till senaste state
  const campaignRef    = useRef(campaign);    campaignRef.current    = campaign;
  const rackSourcesRef = useRef(rackSources); rackSourcesRef.current = rackSources;
  const rackQueuesRef  = useRef(rackQueues);  rackQueuesRef.current  = rackQueues;

  const singleTarget = campaignData?.singleQty || 180;
  const pairQty      = campaignData?.pairQty   || 90;

  // Hämta aktiv kampanj från CDM vid appstart
  useEffect(() => {
    (async () => {
      try {
        const active = await api.getActiveCampaign();
        setCampaign(active.campaignId);
        setCampaignData(active);
      } catch (e) { console.error("[GlasStation] Kampanjer:", e); }
    })();
  }, []);

  // Health-check var 10:e sekund
  useEffect(() => {
    const check = async () => setHealth(await api.health());
    check();
    const t = setInterval(check, 10_000);
    return () => clearInterval(t);
  }, []);

  // Kampanjsökning med 300ms debounce
  useEffect(() => {
    if (!campaignInput || campaignInput === campaign) {
      setLookupResult(null); setLookupStatus(null); return;
    }
    setLookupStatus("loading");
    const t = setTimeout(async () => {
      try {
        const data = await api.lookupCampaign(campaignInput);
        setLookupResult(data); setLookupStatus("found");
      } catch { setLookupResult(null); setLookupStatus("notfound"); }
    }, 300);
    return () => clearTimeout(t);
  }, [campaignInput, campaign]);

  // Callback: ställ är fullt — skicka print-jobb och logga
  const handleRackFull = useCallback(async (robotId, rackId, singleCount) => {
    const robot = ROBOTS.find((r) => r.id === robotId);
    const pairs = Math.floor(singleCount / 2);
    try {
      await api.printRack({ robotId, rackId, pairs, campaignId: campaignRef.current, singleCount });
    } catch (e) { console.error("[GlasStation] Print:", e); }

    const entry = {
      id: genId(), time: new Date(), rackId, quantity: pairs,
      robot: robot?.name || robotId, robotId,
      campaign: campaignRef.current, autoPrinted: true,
    };
    setLog((p) => [entry, ...p]);
    setNotifications((p) => [
      { id: genId(), robotId, robotName: robot?.name, rackId, qty: pairs, time: new Date(), type: "full" },
      ...p.slice(0, 9),
    ]);
    setPrintFlash(robotId);
    setTimeout(() => setPrintFlash(null), 800);
    haptic("heavy");
  }, []);

  // Hämtar nästa ställnummer baserat på vald källa
  const getNextRackId = useCallback((robotId) => {
    const source = rackSourcesRef.current[robotId] || "auto";
    const prefix = MOCK_CAMPAIGNS[campaignRef.current]?.rackPrefix || "WAS";

    if (source === "camera") return null; // Väntar på scan
    if (source === "manual") {
      const queue = rackQueuesRef.current[robotId] || [];
      if (queue.length === 0) return null; // Tom kö
      const next = queue[0];
      setRackQueues((prev) => ({ ...prev, [robotId]: prev[robotId].slice(1) }));
      return next;
    }
    // Auto: generera löpnummer med rätt prefix
    return `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`;
  }, []);

  const { counts, resetRobot, resetAll, setRackId } =
    useRobotFeed(ROBOTS, singleTarget, handleRackFull, campaign, getNextRackId);

  const countsRef     = useRef(counts);     countsRef.current     = counts;
  const resetRobotRef = useRef(resetRobot); resetRobotRef.current = resetRobot;

  // Manuell utkörning av ofyllt ställ (vid omställning)
  const handleManualPrint = useCallback(async (robotId) => {
    const state = countsRef.current?.[robotId];
    if (!state || state.current === 0) return;
    const robot = ROBOTS.find((r) => r.id === robotId);
    const pairs = Math.floor(state.current / 2);

    try {
      await api.printRack({
        robotId, rackId: state.rackId, pairs,
        campaignId: campaignRef.current, singleCount: state.current,
      });
    } catch (e) { console.error("[GlasStation] Manuell print:", e); }

    const entry = {
      id: genId(), time: new Date(), rackId: state.rackId, quantity: pairs,
      robot: robot?.name || robotId, robotId,
      campaign: campaignRef.current, autoPrinted: false,
    };
    setLog((p) => [entry, ...p]);
    setNotifications((p) => [
      { id: genId(), robotId, robotName: robot?.name, rackId: state.rackId, qty: pairs, time: new Date(), type: "manual" },
      ...p.slice(0, 9),
    ]);
    haptic("heavy");
    resetRobotRef.current(robotId);
  }, []);

  // Kampanjbyte
  const switchCampaign = useCallback(async (newId) => {
    const data = await api.lookupCampaign(newId);
    await api.setActiveCampaign(newId);
    setCampaign(newId); setCampaignData(data);
    setCampaignInput(""); setLookupResult(null); setLookupStatus(null);
    resetAll(); setConfirmCampaign(null); setView("main");
    haptic("heavy");
  }, [resetAll]);

  // Ställkälla-handlers
  const handleScan = useCallback((robotId, scannedId) => {
    setRackId(robotId, scannedId);
    haptic("heavy");
  }, [setRackId]);

  const changeSource = useCallback((robotId, newSource) => {
    setRackSources((prev) => ({ ...prev, [robotId]: newSource }));
    haptic("heavy");
  }, []);

  const removeFromQueue = useCallback((robotId, idx) => {
    setRackQueues((prev) => ({ ...prev, [robotId]: prev[robotId].filter((_, i) => i !== idx) }));
    haptic();
  }, []);

  const addToQueue = useCallback((robotId, rackId) => {
    if (!rackId.trim()) return;
    const clean = rackId.trim().toUpperCase();
    setRackQueues((prev) => ({ ...prev, [robotId]: [...(prev[robotId] || []), clean] }));
    setQueueInput("");
    haptic();
    // Om roboten väntar — sätt det nya numret direkt
    const state = countsRef.current?.[robotId];
    if (state?.rackId === "SCAN_PENDING") {
      setRackId(robotId, clean);
      setRackQueues((prev) => ({ ...prev, [robotId]: prev[robotId].slice(1) }));
    }
  }, [setRackId]);

  // Auto-dismiss notifikationer efter 5 sekunder
  useEffect(() => {
    if (notifications.length === 0) return;
    const t = setTimeout(() => setNotifications((p) => p.slice(0, -1)), 5000);
    return () => clearTimeout(t);
  }, [notifications]);

  const dismissN   = (id) => setNotifications((p) => p.filter((n) => n.id !== id));
  const shiftTotal = log.reduce((s, e) => s + e.quantity, 0);

  // Anslutningsstatus i headern
  const connStatus = health.mock
    ? { color: "#f59e0b", label: "MOCK" }
    : (health.cdm && health.winterm && health.robots)
      ? { color: "#22c55e", label: "LIVE" }
      : { color: "#ef4444", label: "OFFLINE" };

  // ─── Gemensamma UI-element ────────────────────────────────────────────────

  const header = (
    <div style={S.header}>
      <div style={S.headerLeft}>
        <div style={S.logo}>GS</div>
        <div>
          <div style={S.headerTitle}>GlasStation</div>
          <div style={S.headerSub}>Plant {CONFIG.PLANT} · Linje {CONFIG.LINE}</div>
        </div>
      </div>
      <button
        style={{ ...S.liveBadge, background: connStatus.color + "22", borderColor: connStatus.color + "66", cursor: "pointer" }}
        onClick={() => { haptic(); setView("system"); }}
      >
        <div style={{ ...S.liveDot, background: connStatus.color, boxShadow: `0 0 8px ${connStatus.color}` }} />
        <span style={{ ...S.liveLabel, color: connStatus.color }}>{connStatus.label}</span>
      </button>
    </div>
  );

  const toasts = notifications.length > 0 && (
    <div style={S.toastContainer}>
      {notifications.slice(0, 2).map((n) => {
        const rob = ROBOTS.find((r) => r.id === n.robotId);
        return (
          <div key={n.id} style={{ ...S.toast, borderLeft: `4px solid ${rob?.color || "#fff"}` }} onClick={() => dismissN(n.id)}>
            <div style={{ flex: 1 }}>
              <div style={S.toastTitle}>🖨️ {n.robotName} — {n.type === "manual" ? "Manuell utskrift" : "Ställ fullt!"}</div>
              <div style={S.toastMeta}>{n.rackId} · {n.qty} par · Skickad till CDM ✓</div>
            </div>
            <div style={{ color: "#555", fontSize: 16, padding: 4 }}>✕</div>
          </div>
        );
      })}
    </div>
  );

  // ─── HUVUDVY ──────────────────────────────────────────────────────────────
  if (view === "main") {
    return (
      <div style={S.container}>
        {header}{toasts}

        {CONFIG.DEMO_MODE && (
          <div style={{ margin: "8px 20px 0", padding: "8px 14px", background: "#1a1506", border: "1px solid #f59e0b44", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13 }}>🎬</span>
            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>DEMOLÄGE — Simulerar packningsprocessen i realtid</span>
          </div>
        )}

        {/* Statistik */}
        <div style={S.statsRow}>
          <div style={S.statCard}><div style={S.statVal}>{shiftTotal}</div><div style={S.statLbl}>Par totalt</div></div>
          <div style={S.statCard}><div style={S.statVal}>{log.length}</div><div style={S.statLbl}>Ställ klara</div></div>
          <div style={S.statCard}>
            <div style={{ ...S.statVal, color: autoPrint ? "#22c55e" : "#ef4444", fontSize: 18 }}>{autoPrint ? "AUTO" : "AV"}</div>
            <div style={S.statLbl}>Utskrift</div>
          </div>
        </div>

        {/* Aktiv kampanj */}
        <div style={{ ...S.campaignBar, cursor: "pointer" }} onClick={() => { haptic(); setView("campaigns"); }}>
          <div style={S.campRow}>
            <div style={{ flex: 1 }}>
              <div style={S.campLabel}>Kampanj · synkad från CDM 2000</div>
              <div style={S.campValue}>{campaign}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
                {campaignData?.name} · {campaignData?.rackName} ({campaignData?.rackPrefix}...) · {campaignData?.pairQty} par
              </div>
            </div>
            <span style={{ color: "#555", fontSize: 20 }}>›</span>
          </div>
        </div>

        <div style={S.sectionTitle}>Robotar — Realtid</div>

        {/* Robotkort */}
        {ROBOTS.map((robot) => {
          const state     = counts[robot.id] || { current: 0, rackId: "—", running: false, speed: 0 };
          const pct       = Math.round((state.current / singleTarget) * 100);
          const pairs     = Math.floor(state.current / 2);
          const stalled   = !CONFIG.MOCK_MODE && (Date.now() - (state.lastTick || 0)) / 1000 > CONFIG.STALL_TIMEOUT_S;
          const source    = rackSources[robot.id] || "auto";
          const isPending = state.rackId === "SCAN_PENDING";
          const queueLen  = (rackQueues[robot.id] || []).length;
          const srcLabel  = { auto: `Auto (${campaignData?.rackName || "—"})`, camera: "Kamera", manual: `Manuell kö (${queueLen})` }[source];
          const srcColor  = { auto: "#6b7280", camera: "#60a5fa", manual: "#a78bfa" }[source];

          return (
            <div key={robot.id}
              style={{
                ...S.robotCard,
                borderColor: printFlash === robot.id ? "#22c55e" : isPending ? "#f59e0b55" : robot.color + "33",
                background:  printFlash === robot.id ? "#060f06" : isPending ? "#1a1206"   : "#0e0e15",
                transition:  "border-color 0.3s, background 0.3s",
              }}
              onClick={() => { haptic(); setDetailRobot(robot.id); setView("detail"); }}
            >
              <div style={S.robotHeader}>
                <div style={S.robotNameRow}>
                  <div style={{ ...S.robotDot, background: robot.color, boxShadow: `0 0 8px ${robot.color}66` }} />
                  <div style={S.robotName}>{robot.name}</div>
                  {state.running && state.speed > 0 && !isPending && <div style={S.runBadge}>+{state.speed}</div>}
                  {isPending && <div style={{ ...S.stallBadge, color: "#f59e0b", borderColor: "#f59e0b44", background: "#1a1206" }}>VÄNTAR PÅ STÄLL</div>}
                  {stalled && <div style={S.stallBadge}>INGEN DATA</div>}
                </div>
                <div style={S.robotRack}>{isPending ? "—" : state.rackId}</div>
              </div>

              <RackVisual pct={pct} color={robot.color} pairs={pairs} pairQty={pairQty} isPending={isPending} />

              <div style={S.progressBg}>
                <div style={{ ...S.progressFill, width: `${pct}%`, background: `linear-gradient(90deg, ${robot.colorLight}, ${robot.color})` }} />
              </div>

              <div style={S.robotFooter}>
                <div>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>{state.current}</span>
                  <span style={{ color: "#555", fontSize: 14 }}> / {singleTarget} enkel</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#9ca3af" }}>{pairs}</span>
                  <span style={{ color: "#555", fontSize: 12 }}> / {pairQty} par</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#555" }}>
                <span style={{ color: srcColor, fontWeight: 600 }}>● {srcLabel}</span>
                <span>{pct}% — utskrift vid {pairQty} par</span>
              </div>

              {state.current > 0 && !isPending && (
                <button style={{ ...S.manualBtn, borderColor: robot.color + "66", color: robot.color }}
                  onClick={(e) => { e.stopPropagation(); handleManualPrint(robot.id); }}>
                  ⏏ Kör ut nu — {pairs} par
                </button>
              )}
              {isPending && (
                <button style={{ ...S.manualBtn, borderColor: "#f59e0b88", color: "#f59e0b", borderStyle: "solid" }}
                  onClick={(e) => { e.stopPropagation(); setDetailRobot(robot.id); setSourceRobot(robot.id); setView("source"); }}>
                  → Ange nästa ställ ({source === "camera" ? "skanna" : "kö tom"})
                </button>
              )}
            </div>
          );
        })}

        <button style={S.logBtn} onClick={() => { haptic(); setView("log"); }}>
          <span>📋</span>
          <span style={{ flex: 1, textAlign: "left", fontWeight: 500 }}>Skiftlogg ({log.length} ställ)</span>
          <span style={{ fontSize: 22, color: "#555" }}>›</span>
        </button>

        {/* Senaste ställ — preview */}
        {log.length > 0 && (
          <div style={{ margin: "0 20px 10px" }}>
            <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Senaste ställ</div>
            {log.slice(0, 4).map((entry) => {
              const rob = ROBOTS.find((r) => r.id === entry.robotId);
              return (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6, background: "#0e0e15", border: `1px solid ${rob?.color || "#1a1a25"}22`, borderRadius: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: rob?.color || "#555", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{entry.rackId}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{entry.robot} · {entry.quantity} par</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{fmtTime(entry.time)}</div>
                  {entry.autoPrinted
                    ? <div style={{ ...S.autoBadge, fontSize: 8 }}>AUTO</div>
                    : <div style={{ ...S.manualBadge, fontSize: 8 }}>MAN</div>
                  }
                </div>
              );
            })}
            {log.length > 4 && (
              <button style={{ width: "100%", padding: "10px", background: "none", border: "1px solid #1a1a25", borderRadius: 10, color: "#555", fontSize: 12, cursor: "pointer" }}
                onClick={() => { haptic(); setView("log"); }}>
                Visa alla {log.length} ställ →
              </button>
            )}
          </div>
        )}

        <div style={S.toggleRow}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8e8" }}>Auto-utskrift</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Skicka till CDM vid fullt ställ</div>
          </div>
          <button style={{ ...S.toggleSwitch, background: autoPrint ? "#16a34a" : "#333" }}
            onClick={() => { haptic(); setAutoPrint(!autoPrint); }}>
            <div style={{ ...S.toggleKnob, transform: autoPrint ? "translateX(22px)" : "translateX(2px)" }} />
          </button>
        </div>

        <div style={{ height: 50 }} />
      </div>
    );
  }

  // ─── SYSTEMVY ─────────────────────────────────────────────────────────────
  if (view === "system") {
    return (
      <div style={S.container}>
        <div style={S.subHeader}>
          <button style={S.backBtn} onClick={() => { haptic(); setView("main"); }}>‹ Tillbaka</button>
          <div style={S.subTitle}>Systemstatus</div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ ...S.connCard, borderColor: connStatus.color + "44" }}>
            <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Anslutningsläge</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: connStatus.color }}>
              {CONFIG.MOCK_MODE ? "MOCK — utvecklingsdata" : connStatus.label}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>
              {CONFIG.MOCK_MODE
                ? "Appen kör med simulerad data. IT aktiverar live-läge efter backend-koppling."
                : "Appen är kopplad mot CDM 2000 och robot-PLC via API-gateway."}
            </div>
          </div>

          <div style={S.sectionTitle}>Delsystem</div>
          <div style={{ padding: "0 20px" }}>
            <StatusRow label="CDM 2000 (kampanjer & logg)" ok={health.cdm}     mock={health.mock} />
            <StatusRow label="WinTerm (utskrift)"        ok={health.winterm} mock={health.mock} />
            <StatusRow label="Robot-PLC (ABB IRC5)"     ok={health.robots}  mock={health.mock} />
          </div>

          <div style={S.sectionTitle}>Konfiguration</div>
          <div style={S.kvList}>
            <KV k="API_BASE"         v={CONFIG.API_BASE || "— ej satt —"} />
            <KV k="WS_URL"           v={CONFIG.WS_URL   || "— ej satt —"} />
            <KV k="PLANT"            v={CONFIG.PLANT} />
            <KV k="LINE"             v={CONFIG.LINE} />
            <KV k="MOCK_MODE"        v={String(CONFIG.MOCK_MODE)} />
            <KV k="DEMO_MODE"        v={String(CONFIG.DEMO_MODE)} />
            <KV k="POLL_INTERVAL_MS" v={String(CONFIG.POLL_INTERVAL_MS)} />
          </div>

          <div style={{ marginTop: 20, padding: 14, background: "#0e0e15", border: "1px solid #1a1a25", borderRadius: 12, fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: 6 }}>För IT/Automation</div>
            Sätt <span style={{ fontFamily: "monospace", color: "#fff" }}>MOCK_MODE=false</span> och <span style={{ fontFamily: "monospace", color: "#fff" }}>DEMO_MODE=false</span> i <span style={{ fontFamily: "monospace", color: "#fff" }}>src/config.js</span> när backend är kopplad.
          </div>

          {/* Diskret signatur */}
          <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "#2a2a35" }}>
            Byggt av Jonathan · Linje 4208 · Plant 310
          </div>
        </div>
        <div style={{ height: 50 }} />
      </div>
    );
  }

  // ─── DETALJVY ─────────────────────────────────────────────────────────────
  if (view === "detail" && detailRobot) {
    const robot    = ROBOTS.find((r) => r.id === detailRobot);
    const state    = counts[detailRobot] || { current: 0, rackId: "—", running: false };
    const pct      = Math.round((state.current / singleTarget) * 100);
    const pairs    = Math.floor(state.current / 2);
    const isPend   = state.rackId === "SCAN_PENDING";
    const robotLog = log.filter((e) => e.robotId === detailRobot);
    const source   = rackSources[detailRobot] || "auto";
    const qLen     = (rackQueues[detailRobot] || []).length;
    const srcLabel = { auto: `Auto (${campaignData?.rackName || "—"})`, camera: "Kamera", manual: `Manuell kö (${qLen})` }[source];
    const srcColor = { auto: "#6b7280", camera: "#60a5fa", manual: "#a78bfa" }[source];

    return (
      <div style={S.container}>
        {toasts}
        <div style={S.subHeader}>
          <button style={S.backBtn} onClick={() => { haptic(); setView("main"); }}>‹ Tillbaka</button>
          <div style={S.subTitle}>{robot.name}</div>
        </div>

        <div style={{ ...S.detailHero, background: robot.bg }}>
          <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 16px" }}>
            <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1a1a25" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={robot.color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${pct * 3.27} 327`} style={{ transition: "stroke-dasharray 0.6s ease-out" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{pct}%</div>
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
            {state.current} / {singleTarget} <span style={{ fontSize: 14, color: "#6b7280" }}>enkel</span>
          </div>
          <div style={{ fontSize: 16, color: "#9ca3af", marginTop: 4 }}>
            {pairs} / {pairQty} <span style={{ fontSize: 13, color: "#555" }}>par</span>
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8, fontFamily: "monospace" }}>
            Ställ: {isPend ? "(väntar)" : state.rackId}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: isPend ? "#f59e0b" : "#22c55e" }}>
            {isPend ? "■ Väntar på ställ" : `● Kör — auto-byte vid ${singleTarget} enkel`}
          </div>
          {state.current > 0 && !isPend && (
            <button style={{ ...S.manualBtn, borderColor: robot.color + "66", color: robot.color, marginTop: 14, maxWidth: 250, marginLeft: "auto", marginRight: "auto" }}
              onClick={() => handleManualPrint(robot.id)}>
              ⏏ Kör ut nu — {pairs} par
            </button>
          )}
        </div>

        <div style={S.sectionTitle}>Ställkälla</div>
        <button style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% - 40px)", margin: "0 20px", padding: "14px 16px", background: "#0e0e15", border: `1px solid ${srcColor}44`, borderRadius: 14, cursor: "pointer", color: "#e8e8e8" }}
          onClick={() => { haptic(); setSourceRobot(detailRobot); setView("source"); }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: srcColor }} />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{srcLabel}</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
              {source === "auto"   && "Automatisk prefix från kampanj"}
              {source === "camera" && "Kamera skannar ställ-ID"}
              {source === "manual" && "Skriv in ställnummer i förväg"}
            </div>
          </div>
          <span style={{ fontSize: 22, color: "#555" }}>›</span>
        </button>

        <div style={S.sectionTitle}>Historik — {robot.name} ({robotLog.length} ställ)</div>
        {robotLog.length === 0
          ? <div style={S.emptyState}>Inga ställ registrerade ännu</div>
          : (
            <div style={{ padding: "0 20px" }}>
              {robotLog.map((entry, i) => (
                <div key={entry.id} style={S.logEntry}>
                  <div style={{ ...S.logNum, background: robot.color + "22", color: robot.color }}>{robotLog.length - i}</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.logRack}>{entry.rackId}</div>
                    <div style={S.logMeta}>{entry.quantity} par · {fmtTime(entry.time)}</div>
                  </div>
                  {entry.autoPrinted ? <div style={S.autoBadge}>AUTO</div> : <div style={S.manualBadge}>MANUELL</div>}
                </div>
              ))}
            </div>
          )
        }
        <div style={{ height: 50 }} />
      </div>
    );
  }

  // ─── LOGGVY ───────────────────────────────────────────────────────────────
  if (view === "log") {
    const filtered = log.filter((e) => !selectedRobot || e.robotId === selectedRobot);
    return (
      <div style={S.container}>
        <div style={S.subHeader}>
          <button style={S.backBtn} onClick={() => { haptic(); setView("main"); }}>‹ Tillbaka</button>
          <div style={S.subTitle}>Skiftlogg</div>
        </div>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #151520", fontSize: 13, color: "#6b7280" }}>
          {fmtDate(new Date())} · {log.length} ställ · {shiftTotal} par
        </div>
        <div style={S.filterRow}>
          <button style={{ ...S.filterChip, ...(selectedRobot === null ? S.filterActive : {}) }}
            onClick={() => setSelectedRobot(null)}>Alla</button>
          {ROBOTS.map((r) => (
            <button key={r.id}
              style={{ ...S.filterChip, ...(selectedRobot === r.id ? { ...S.filterActive, borderColor: r.color, color: r.color, background: r.bg } : {}) }}
              onClick={() => setSelectedRobot(selectedRobot === r.id ? null : r.id)}>{r.name}</button>
          ))}
        </div>
        {filtered.length === 0
          ? <div style={S.emptyState}>Inga ställ att visa</div>
          : (
            <div style={{ padding: "0 20px" }}>
              {filtered.map((entry, i) => {
                const rob = ROBOTS.find((r) => r.id === entry.robotId);
                return (
                  <div key={entry.id} style={S.logEntry}>
                    <div style={{ ...S.logNum, background: rob ? rob.color + "22" : "#1e1e2a", color: rob?.color || "#6b7280" }}>{filtered.length - i}</div>
                    <div style={{ flex: 1 }}>
                      <div style={S.logRack}>{entry.rackId}<span style={{ color: rob?.color, fontWeight: 600, fontSize: 13 }}> · {entry.robot}</span></div>
                      <div style={S.logMeta}>{entry.quantity} par · {fmtTime(entry.time)} · Kamp {entry.campaign}</div>
                    </div>
                    {entry.autoPrinted ? <div style={S.autoBadge}>AUTO</div> : <div style={S.manualBadge}>MANUELL</div>}
                  </div>
                );
              })}
            </div>
          )
        }
        <div style={{ height: 50 }} />
      </div>
    );
  }

  // ─── KAMPANJVY ────────────────────────────────────────────────────────────
  if (view === "campaigns") {
    const hasGlass  = Object.values(counts).some((c) => c.current > 0);
    const canSwitch = lookupStatus === "found" && campaignInput !== campaign;

    return (
      <div style={S.container}>
        <div style={S.subHeader}>
          <button style={S.backBtn} onClick={() => { haptic(); setCampaignInput(""); setView("main"); }}>‹ Tillbaka</button>
          <div style={S.subTitle}>Byt kampanj</div>
        </div>

        <div style={{ padding: "14px 20px", borderBottom: "1px solid #151520" }}>
          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Aktiv kampanj</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{campaign}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {campaignData?.name} · {campaignData?.rackName} · {campaignData?.pairQty} par / ställ
          </div>
        </div>

        <div style={{ padding: "16px 20px 8px" }}>
          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            Skriv in kampanjnummer (hämtas från CDM 2000)
          </div>
          <input style={{ width: "100%", padding: "16px", fontSize: 20, fontWeight: 700, background: "#0e0e15", border: "2px solid #1a1a25", borderRadius: 14, color: "#fff", outline: "none", boxSizing: "border-box", fontFamily: "monospace", letterSpacing: 2, textAlign: "center" }}
            type="text" inputMode="numeric" value={campaignInput}
            onChange={(e) => setCampaignInput(e.target.value)} placeholder="Kampanjnummer..." autoFocus />
          {campaignInput && (
            <div style={{ marginTop: 10 }}>
              {lookupStatus === "loading" && <div style={{ padding: "12px 14px", background: "#0e0e15", border: "1px solid #1a1a25", borderRadius: 12, fontSize: 13, color: "#6b7280" }}>Hämtar från CDM 2000...</div>}
              {lookupStatus === "found" && lookupResult && (
                <div style={{ padding: "12px 14px", background: "#060f06", border: "1px solid #22c55e33", borderRadius: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>✓ {lookupResult.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Ställ: {lookupResult.rackName} ({lookupResult.rackPrefix}...) · {lookupResult.pairQty} par · {lookupResult.singleQty} enkel</div>
                </div>
              )}
              {lookupStatus === "notfound" && (
                <div style={{ padding: "10px 14px", background: "#1a0a0a", border: "1px solid #ef444433", borderRadius: 12, fontSize: 13, color: "#ef4444" }}>
                  Kampanj "{campaignInput}" finns inte i CDM 2000
                </div>
              )}
            </div>
          )}
        </div>

        {canSwitch && (
          <div style={{ padding: "8px 20px" }}>
            {hasGlass ? (
              <button style={{ ...S.dialogBtn, width: "100%", background: "#f59e0b", color: "#000", fontSize: 16, padding: 16 }}
                onClick={() => { haptic(); setConfirmCampaign(campaignInput); }}>
                ⚠️ Kör ut ställ & byt till {lookupResult.name}
              </button>
            ) : (
              <button style={{ ...S.dialogBtn, width: "100%", background: "#16a34a", color: "#fff", fontSize: 16, padding: 16 }}
                onClick={() => switchCampaign(campaignInput)}>
                ✓ Byt till {lookupResult.name}
              </button>
            )}
          </div>
        )}

        {confirmCampaign && (
          <div style={S.confirmOverlay}>
            <div style={S.confirmDialog}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Omställning</div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 4 }}>Från: <span style={{ color: "#fff", fontWeight: 600 }}>{campaignData?.name}</span></div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 16 }}>Till: <span style={{ color: "#fff", fontWeight: 600 }}>{lookupResult?.name}</span></div>
              <div style={{ fontSize: 13, color: "#f59e0b", marginBottom: 12, padding: "10px 12px", background: "#1a1506", borderRadius: 10, border: "1px solid #f59e0b33" }}>
                ⚠️ Det finns glas i robotarna. Kör ut stället först eller byt ändå.
              </div>
              {ROBOTS.map((r) => {
                const c = counts[r.id];
                if (!c || c.current === 0) return null;
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a25" }}>
                    <div>
                      <span style={{ color: "#fff", fontWeight: 600 }}>{r.name}</span>
                      <span style={{ color: "#6b7280" }}> — {c.current} enkel ({Math.floor(c.current / 2)} par)</span>
                    </div>
                    <button style={{ background: "none", border: "1px solid #f59e0b44", borderRadius: 8, color: "#f59e0b", fontSize: 12, fontWeight: 700, padding: "4px 10px", cursor: "pointer" }}
                      onClick={() => { handleManualPrint(r.id); haptic(); }}>Kör ut</button>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button style={{ ...S.dialogBtn, flex: 1, background: "#1a1a25", color: "#9ca3af" }}
                  onClick={() => { haptic(); setConfirmCampaign(null); }}>Avbryt</button>
                <button style={{ ...S.dialogBtn, flex: 1, background: "#16a34a", color: "#fff" }}
                  onClick={() => switchCampaign(confirmCampaign)}>Byt ändå</button>
              </div>
            </div>
          </div>
        )}
        <div style={{ height: 50 }} />
      </div>
    );
  }

  // ─── KÄLLVY ───────────────────────────────────────────────────────────────
  if (view === "source" && sourceRobot) {
    const robot     = ROBOTS.find((r) => r.id === sourceRobot);
    const source    = rackSources[sourceRobot] || "auto";
    const queue     = rackQueues[sourceRobot]  || [];
    const state     = counts[sourceRobot]      || {};
    const isPending = state.rackId === "SCAN_PENDING";
    const prefix    = MOCK_CAMPAIGNS[campaign]?.rackPrefix || "WAS";

    const simulateScan = () => {
      const scanned = `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`;
      handleScan(sourceRobot, scanned);
    };

    const SOURCE_OPTIONS = [
      { id: "auto",   icon: "⚙️", label: "Auto (ställtyp från CDM)", color: "#6b7280", desc: "CDM anger ställtypen (JLR, Pinta5 eller RFU2) via kampanjen. Appen genererar löpnummer med rätt prefix automatiskt." },
      { id: "camera", icon: "📷", label: "Kamera (scanning)",         color: "#60a5fa", desc: "En kamera läser av ställets streckkod när det rullar in. Rätt ställnummer hamnar automatiskt på lappen." },
      { id: "manual", icon: "📋", label: "Manuell kö",                color: "#a78bfa", desc: "Skriv in ställnumren i förväg i den ordning roboten ska packa dem. Appen jobbar sig igenom listan." },
    ];

    return (
      <div style={S.container}>
        <div style={S.subHeader}>
          <button style={S.backBtn} onClick={() => { haptic(); setView("detail"); }}>‹ Tillbaka</button>
          <div style={S.subTitle}>{robot.name} — Ställkälla</div>
        </div>

        <div style={{ padding: "12px 20px 0" }}>
          {SOURCE_OPTIONS.map((opt) => {
            const isActive = source === opt.id;
            return (
              <button key={opt.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 14, width: "100%", padding: "14px 16px", marginBottom: 10, background: isActive ? "#0e0e15" : "#08080d", border: `2px solid ${isActive ? opt.color : "#1a1a25"}`, borderRadius: 14, cursor: "pointer", textAlign: "left" }}
                onClick={() => { haptic(); changeSource(sourceRobot, opt.id); }}>
                <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isActive ? opt.color : "#9ca3af" }}>{opt.label}</div>
                    {isActive && <div style={{ fontSize: 9, fontWeight: 800, color: opt.color, background: opt.color + "22", border: `1px solid ${opt.color}44`, borderRadius: 5, padding: "2px 8px", letterSpacing: 1 }}>AKTIV</div>}
                  </div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.4 }}>{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Kameraläge */}
        {source === "camera" && (
          <div style={{ padding: "0 20px" }}>
            <div style={S.sectionTitle}>Kameraläge</div>
            <div style={{ padding: "16px", background: "#090f1a", border: "1px solid #1a2a4a", borderRadius: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14, lineHeight: 1.5 }}>
                I produktion läser en kamera streckkoden på stället när det rullar in, och skickar ställnumret automatiskt via WebSocket. Tills kameran är inkopplad kan du mata in numret manuellt nedan.
              </div>

              {isPending ? (
                <div style={{ padding: "12px 14px", background: "#1a1506", border: "1px solid #f59e0b44", borderRadius: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>■ Väntar på scan</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Roboten väntar. Scanna ett ställ-ID för att fortsätta.</div>
                </div>
              ) : state.rackId ? (
                <div style={{ padding: "12px 14px", background: "#060f06", border: "1px solid #22c55e33", borderRadius: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.8 }}>Aktivt ställ</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e", fontFamily: "monospace" }}>{state.rackId}</div>
                </div>
              ) : null}

              <div style={{ fontSize: 11, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Mata in / scanna ställ-ID</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input style={{ flex: 1, padding: "13px 14px", fontSize: 16, fontWeight: 700, background: "#0e0e15", border: "2px solid #1a2a4a", borderRadius: 12, color: "#fff", outline: "none", fontFamily: "monospace", letterSpacing: 1 }}
                  value={queueInput} onChange={(e) => setQueueInput(e.target.value.toUpperCase())} placeholder={`${prefix}xxxx`}
                  onKeyDown={(e) => { if (e.key === "Enter" && queueInput.trim()) { handleScan(sourceRobot, queueInput.trim()); setQueueInput(""); } }} />
                <button style={{ padding: "13px 18px", background: "#0c1a3d", border: "1px solid #2563eb66", borderRadius: 12, color: "#60a5fa", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
                  onClick={() => { if (queueInput.trim()) { handleScan(sourceRobot, queueInput.trim()); setQueueInput(""); } }}>OK</button>
              </div>

              <button style={{ ...S.dialogBtn, width: "100%", background: "#0c1a3d", border: "1px solid #2563eb66", color: "#60a5fa", fontSize: 15, padding: "14px" }}
                onClick={() => { simulateScan(); haptic("heavy"); }}>📷 Simulera kamerascan</button>
            </div>
          </div>
        )}

        {/* Manuell kö */}
        {source === "manual" && (
          <div style={{ padding: "0 20px" }}>
            <div style={S.sectionTitle}>Ställnummerköen</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input style={{ flex: 1, padding: "13px 14px", fontSize: 16, fontWeight: 700, background: "#0e0e15", border: "2px solid #1a1a25", borderRadius: 12, color: "#fff", outline: "none", fontFamily: "monospace", letterSpacing: 1 }}
                value={queueInput} onChange={(e) => setQueueInput(e.target.value.toUpperCase())} placeholder={`${prefix}xxxx`}
                onKeyDown={(e) => { if (e.key === "Enter") addToQueue(sourceRobot, queueInput); }} />
              <button style={{ padding: "13px 20px", background: "#2563eb", border: "none", borderRadius: 12, color: "#fff", fontSize: 20, fontWeight: 800, cursor: "pointer" }}
                onClick={() => addToQueue(sourceRobot, queueInput)}>+</button>
            </div>

            {state.rackId && !isPending && (
              <div style={{ padding: "12px 14px", background: "#060f06", border: "1px solid #22c55e33", borderRadius: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.8 }}>Packas just nu</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e", fontFamily: "monospace" }}>{state.rackId}</div>
              </div>
            )}

            {isPending && (
              <div style={{ padding: "12px 14px", background: "#1a1506", border: "1px solid #f59e0b44", borderRadius: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>■ Kön är tom — roboten väntar</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Lägg till ställnummer så börjar roboten direkt.</div>
              </div>
            )}

            {queue.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#555", fontSize: 13 }}>Kön är tom. Lägg till ställnummer ovan.</div>
            ) : (
              <div style={{ background: "#0e0e15", border: "1px solid #1a1a25", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
                {queue.map((rackId, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: idx < queue.length - 1 ? "1px solid #151520" : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: "#1a1a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#555", marginRight: 12, flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: 0.5 }}>{rackId}</div>
                    {idx === 0 && <div style={{ fontSize: 9, fontWeight: 800, color: "#22c55e", background: "#0a2a0a", border: "1px solid #22c55e44", borderRadius: 5, padding: "2px 8px", letterSpacing: 1, marginRight: 8 }}>NÄST</div>}
                    <button style={{ background: "none", border: "none", color: "#ef4444", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}
                      onClick={() => removeFromQueue(sourceRobot, idx)}>×</button>
                  </div>
                ))}
              </div>
            )}

            <button style={{ ...S.dialogBtn, width: "100%", background: "#111118", border: "1px solid #1a1a25", color: "#9ca3af", padding: "12px" }}
              onClick={() => {
                haptic();
                for (let i = 0; i < 5; i++) {
                  const id = `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`;
                  setRackQueues((prev) => ({ ...prev, [sourceRobot]: [...(prev[sourceRobot] || []), id] }));
                }
              }}>Generera 5 testställ</button>
          </div>
        )}

        <div style={{ height: 50 }} />
      </div>
    );
  }

  return null;
}
