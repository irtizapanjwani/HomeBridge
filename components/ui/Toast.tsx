"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Tone = "info" | "warn";
type ToastItem = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: Tone = "info") => {
    const id = nextId++;
    setItems((cur) => [...cur.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[200] flex w-[min(92vw,440px)] -translate-x-1/2 flex-col items-center gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full animate-toast-in rounded-xl border-l-4 bg-forest-900 px-4 py-3 text-base text-cream shadow-card ${
              t.tone === "warn" ? "border-[#E07B5F]" : "border-gold"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
