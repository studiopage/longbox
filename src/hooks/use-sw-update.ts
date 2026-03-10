"use client";
import { useState, useEffect, useCallback } from "react";
export function useSwUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) setWaitingWorker(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) setWaitingWorker(nw); });
      });
    });
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!refreshing) { refreshing = true; window.location.reload(); } });
  }, []);
  const applyUpdate = useCallback(() => { waitingWorker?.postMessage({ type: "SKIP_WAITING" }); }, [waitingWorker]);
  return { updateAvailable: waitingWorker !== null, applyUpdate };
}
