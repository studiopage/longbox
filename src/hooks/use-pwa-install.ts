"use client";
import { useState, useEffect, useCallback } from "react";
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}
type InstallStatus = "unsupported" | "installable" | "installed" | "dismissed";
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<InstallStatus>("unsupported");
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) { setStatus("installed"); return; }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); setStatus("installable"); };
    const installedHandler = () => { setStatus("installed"); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => { window.removeEventListener("beforeinstallprompt", handler); window.removeEventListener("appinstalled", installedHandler); };
  }, []);
  const triggerInstall = useCallback(async (): Promise<"accepted" | "dismissed" | null> => {
    if (!deferredPrompt) return null;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "dismissed") setStatus("dismissed");
    return outcome;
  }, [deferredPrompt]);
  return { status, isInstallable: status === "installable", isInstalled: status === "installed", triggerInstall };
}
