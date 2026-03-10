"use client";
import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOffline = () => { setIsOffline(true); setWasOffline(true); setShowReconnected(false); };
    const handleOnline = () => { setIsOffline(false); if (wasOffline) { setShowReconnected(true); const t = setTimeout(() => { setShowReconnected(false); setWasOffline(false); }, 3000); return () => clearTimeout(t); } };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => { window.removeEventListener("offline", handleOffline); window.removeEventListener("online", handleOnline); };
  }, [wasOffline]);
  if (!isOffline && !showReconnected) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "center", padding: 8, pointerEvents: "none" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 500, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", ...(isOffline ? { background: "rgba(40,20,10,0.9)", border: "1px solid rgba(200,100,50,0.3)", color: "rgba(240,160,100,0.9)" } : { background: "rgba(10,30,15,0.9)", border: "1px solid rgba(160,180,145,0.3)", color: "rgba(160,180,145,0.9)" }) }}>
        {isOffline ? <><WifiOff size={14} />You&apos;re offline — showing cached content</> : <><span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(160,180,145,0.9)", display: "inline-block" }} />Back online</>}
      </div>
    </div>
  );
}
