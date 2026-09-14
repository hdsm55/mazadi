import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amountMinor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

export function formatTimeRemaining(endAt: Date | string): string {
  const end = typeof endAt === "string" ? new Date(endAt) : endAt;
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
