import { cn } from "@/lib/utils";

// Lightweight, dependency-free bar chart rendered with CSS. Used for the
// Reports / Overview analytics. No external chart library required.

export interface BarDatum {
  label: string;
  value: number;
}

export function SimpleBarChart({
  data,
  className,
  formatValue = (v: number) => String(v),
}: {
  data: BarDatum[];
  className?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs font-medium text-muted-foreground">{d.label}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-secondary">
            <div
              className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-accent/70 to-accent px-2 transition-all duration-500"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            >
              <span className="text-[10px] font-semibold tabular-nums text-accent-foreground">
                {formatValue(d.value)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
