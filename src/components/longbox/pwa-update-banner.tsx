"use client";
import { RefreshCw } from "lucide-react";
import { useSwUpdate } from "@/hooks/use-sw-update";
export function PwaUpdateBanner() {
  const { updateAvailable, applyUpdate } = useSwUpdate();
  if (!updateAvailable) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "center", padding: "10px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 100, background: "rgba(13,20,16,0.97)", border: "1px solid rgba(160,180,145,0.25)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Update available</span>
        <button onClick={applyUpdate} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 100, background: "rgba(160,180,145,0.2)", border: "1px solid rgba(160,180,145,0.3)", color: "#c0c8b8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw size={12} />Update
        </button>
      </div>
    </div>
  );
}
