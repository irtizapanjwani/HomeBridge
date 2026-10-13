"use client";

import { useEffect, useState } from "react";
import { PhoneDeviceIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallBanner() {
  const toast = useToast();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") toast("HomeBridge is on your home screen.");
      setPrompt(null);
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(
      ios
        ? "On iPhone: tap the Share button, then “Add to Home Screen”."
        : "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.",
    );
  }

  return (
    <section className="border-t border-line bg-cream" aria-label="Install HomeBridge">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3.5 px-[clamp(16px,4vw,28px)] py-4 text-forest-800">
        <div className="flex items-center gap-3.5">
          <PhoneDeviceIcon size={30} className="shrink-0" />
          <span className="text-[15px] font-semibold">
            Add HomeBridge to your phone’s home screen — it works like an app, even on slow data.
          </span>
        </div>
        <button
          type="button"
          onClick={install}
          className="min-h-11 rounded-full border border-forest-800 bg-transparent px-5 text-[15px] font-semibold text-forest-800 transition hover:bg-forest-800 hover:text-cream"
        >
          Install
        </button>
      </div>
    </section>
  );
}
