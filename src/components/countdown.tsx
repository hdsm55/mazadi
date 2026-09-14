"use client";

import { useEffect, useState } from "react";

export function formatCountdown(endAt: string): string {
  const end = new Date(endAt).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return "Ended";
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Countdown({
  endAt,
  className,
  urgent = false,
}: {
  endAt: string;
  className?: string;
  urgent?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(endAt).getTime() - now;
  const ended = diff <= 0;
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const urgentActive = urgent && !ended && totalSeconds < 3600;

  return (
    <span
      className={`tabular-nums font-semibold ${urgentActive ? "text-destructive" : ""} ${className ?? ""}`}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      {ended ? "Ended" : h > 0 ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`}
    </span>
  );
}
