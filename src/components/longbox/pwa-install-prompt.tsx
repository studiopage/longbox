"use client";
import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
const DISMISSED_KEY = "longbox-pwa-install-dismissed";
export function PwaInstallPrompt() {
  const { isInstallable, isInstalled, triggerInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  useEffect(() => {
    if (!isInstallable || isInstalled) return;
    if (!localStorage.getItem(DISMISSED_KEY)) { const t = setTimeout(() => setVisible(true), 2000); return () => clearTimeout(t); }
  }, [isInstallable, isInstalled]);
  const handleInstall = async () => { setInstalling(true); const outcome = await triggerInstall(); if (outcome === "accepted") setVisible(false); else setInstalling(false); };
  const handleDismiss = () => { localStorage.setItem(DISMISSED_KEY, "true"); setVisible(false); };
  if (!visible) return null;
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96" role="banner">
      <div style={{ background: "linear-gradient(135deg,#111a14,#0d1a10)", border: "1px solid rgba(160,180,145,0.2)", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ height: 2, background: "linear-gradient(90deg,transparent,rgba(160,180,145,0.4),transparent)" }} />
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(160,180,145,0.1)", border: "1px solid rgba(160,180,145,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Smartphone size={20} style={{ color: "rgba(160,180,145,0.8)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#c0c8b8", fontSize: 14, fontWeight: 600, margin: 0 }}>Install Longbox</p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "4px 0 0" }}>Add to your home screen for the best reading experience</p>
            </div>
            <button onClick={handleDismiss} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.3)" }}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleInstall} disabled={installing} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 10, background: "rgba(160,180,145,0.2)", border: "1px solid rgba(160,180,145,0.3)", color: "#c0c8b8", fontSize: 13, fontWeight: 600, cursor: installing ? "not-allowed" : "pointer" }}>
              <Download size={14} />{installing ? "Installing…" : "Install"}
            </button>
            <button onClick={handleDismiss} style={{ padding: "10px 16px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer" }}>Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
