// =============================================================================
// GlasStation — useRobotFeed
// =============================================================================
// React-hook som hanterar realtidsdata från robotarna.
//
// I MOCK_MODE (demo/testläge) simuleras packningsprocessen lokalt:
//   - Tre robotar startar på olika fyllnadsnivåer (ser realistiskt ut)
//   - Räknaren ökas med 3–8 glas per tick (600ms i DEMO_MODE)
//   - När ett ställ är fullt triggas onRackFull() och ett nytt ställ startas
//
// I produktionsläge (MOCK_MODE=false) ansluter hooken till en WebSocket
// som gatewayen tillhandahåller. Gatewayen läser OPC-UA-taggar från ABB IRC5
// och pushar uppdateringar i formatet:
//   { robotId: "alva", count: 137, rackId: "AWAS4821", running: true, speed: 2 }
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { CONFIG, MOCK_CAMPAIGNS } from "../config.js";
import { api } from "../api.js";

/**
 * @param {Array}    robots        - Robotdefinitioner från config.js
 * @param {number}   singleTarget  - Antal enkelglas tills stället är fullt
 * @param {Function} onRackFull    - Callback: (robotId, rackId, count) => void
 * @param {string}   campaignId    - Aktiv kampanj (styr ställprefix)
 * @param {Function} getNextRackId - Callback: (robotId) => string | null
 *                                   Returnerar nästa ställnummer, eller null
 *                                   om roboten ska pausa (kamera/tom kö).
 */
export function useRobotFeed(robots, singleTarget, onRackFull, campaignId, getNextRackId) {
  // Räknartillstånd per robot: { current, rackId, running, speed, lastTick }
  const [counts, setCounts] = useState(() => {
    const c = {};
    robots.forEach((r) => {
      c[r.id] = { current: 0, rackId: "—", running: false, speed: 0, lastTick: Date.now() };
    });
    return c;
  });

  // Ref till getNextRackId så att simulerings-intervallet alltid
  // har tillgång till senaste versionen utan att behöva inkluderas i dep-array.
  const getNextRef = useRef(getNextRackId);
  getNextRef.current = getNextRackId;

  // ── MOCK-SIMULERING ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!CONFIG.MOCK_MODE) return;

    // Starta robotarna på olika fyllnadsnivåer för ett realistiskt intryck.
    const START_LEVELS = [0.15, 0.45, 0.72]; // Alva: ny, Ylva: halvvägs, Olof: nästan klar
    setCounts(() => {
      const c = {};
      robots.forEach((r, i) => {
        const prefix = MOCK_CAMPAIGNS[campaignId]?.rackPrefix || "WAS";
        c[r.id] = {
          current:  Math.floor(singleTarget * START_LEVELS[i]),
          rackId:   `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`,
          running:  true,
          speed:    0,
          lastTick: Date.now(),
        };
      });
      return c;
    });

    const interval = setInterval(() => {
      setCounts((prev) => {
        const next = { ...prev };
        robots.forEach((r) => {
          const state = { ...next[r.id] };
          if (!state.running) { next[r.id] = state; return; }

          // SCAN_PENDING: roboten väntar på att ett ställ scannas/läggs i kö.
          if (state.rackId === "SCAN_PENDING") {
            state.speed = 0;
            next[r.id] = state;
            return;
          }

          // Räkna upp glasen. Demo: 3–8/tick. Produktion: 2–6/tick.
          const add = CONFIG.DEMO_MODE
            ? Math.floor(Math.random() * 6) + 3
            : Math.random() > 0.2 ? Math.floor(Math.random() * 5) + 2 : 0;

          state.speed   = add;
          state.current = Math.min(state.current + add, singleTarget);
          state.lastTick = Date.now();

          // Stället är fullt — trigga utskrift och starta nästa.
          if (state.current >= singleTarget) {
            onRackFull(r.id, state.rackId, singleTarget);

            const nextRack = getNextRef.current?.(r.id);
            state.current = 0;

            if (nextRack) {
              // Nästa ställ från källa (auto/kamera/kö)
              state.rackId = nextRack;
            } else {
              // Ingen källa tillgänglig — pausa tills operatören anger ett ställ
              state.rackId = "SCAN_PENDING";
            }
            state.running = true;
          }

          next[r.id] = state;
        });
        return next;
      });
    }, CONFIG.POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [robots, singleTarget, onRackFull, campaignId]);

  // ── WEBSOCKET (PRODUKTION) ─────────────────────────────────────────────────
  // Ansluter till gatewayen och tar emot robotstatus i realtid.
  // Automatisk återanslutning om WebSocket tappar förbindelsen.
  useEffect(() => {
    if (CONFIG.MOCK_MODE || !CONFIG.WS_URL) return;

    let ws, reconnectTimer;

    const connect = () => {
      ws = new WebSocket(CONFIG.WS_URL);

      ws.onmessage = (ev) => {
        try {
          // Förväntat format: { robotId, count, rackId, running, speed }
          const msg = JSON.parse(ev.data);
          setCounts((prev) => {
            const prevState = prev[msg.robotId];
            const next = {
              ...prev,
              [msg.robotId]: { ...prevState, ...msg, lastTick: Date.now() },
            };
            // Detektera att ett ställ precis blivit fullt
            if (prevState && msg.count >= singleTarget && prevState.current < singleTarget) {
              onRackFull(msg.robotId, msg.rackId, singleTarget);
            }
            return next;
          });
        } catch (e) {
          console.error("[GlasStation] WebSocket parse-fel:", e);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => { clearTimeout(reconnectTimer); ws?.close(); };
  }, [singleTarget, onRackFull]);

  // ── RESET-FUNKTIONER ───────────────────────────────────────────────────────

  // Nollställer en enskild robot och tilldelar ett nytt ställnummer.
  const resetRobot = useCallback(async (robotId) => {
    const fromSource = getNextRef.current?.(robotId);
    const rackId = fromSource || (await api.nextRackId(robotId, campaignId)).rackId;
    setCounts((prev) => ({
      ...prev,
      [robotId]: { current: 0, rackId, running: true, speed: 0, lastTick: Date.now() },
    }));
  }, [campaignId]);

  // Nollställer alla robotar — används vid kampanjbyte.
  const resetAll = useCallback(async () => {
    const next = {};
    for (const r of robots) {
      const fromSource = getNextRef.current?.(r.id);
      const rackId = fromSource || (await api.nextRackId(r.id, campaignId)).rackId;
      next[r.id] = { current: 0, rackId, running: true, speed: 0, lastTick: Date.now() };
    }
    setCounts(next);
  }, [robots, campaignId]);

  // Uppdaterar ställnumret för en robot (används av kamera/manuell kö).
  const setRackId = useCallback((robotId, rackId) => {
    setCounts((prev) => ({
      ...prev,
      [robotId]: { ...prev[robotId], rackId, lastTick: Date.now() },
    }));
  }, []);

  return { counts, resetRobot, resetAll, setRackId };
}
