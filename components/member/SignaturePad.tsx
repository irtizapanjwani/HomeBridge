"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A box to sign in with a finger, stylus or mouse. Reports the drawing as a PNG data URL, or null
 * when the box is empty, so a form can insist on a signature before sending.
 */
export function SignaturePad({ id, label, onChange }: { id: string; label: string; onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  // The canvas is drawn at the screen's pixel density, so the signature is sharp on a phone.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * ratio);
    c.height = Math.round(rect.height * ratio);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1A1D1A";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (!empty && canvasRef.current) onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-[15px] font-semibold text-ink">
        {label}
      </span>
      <canvas
        ref={canvasRef}
        aria-labelledby={`${id}-label`}
        role="img"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        className="h-[140px] w-full touch-none rounded-xl border border-line-strong/70 bg-white"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-muted">{empty ? "Sign with your finger or mouse in the box." : "Signed."}</span>
        <button type="button" onClick={clear} className="min-h-9 text-[13.5px] font-medium text-forest-800 underline underline-offset-[3px]">
          Clear
        </button>
      </div>
    </div>
  );
}
