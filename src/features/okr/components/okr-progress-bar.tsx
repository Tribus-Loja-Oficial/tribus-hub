import { cn } from "@/lib/utils/cn";
import type { PaceHealthSlug } from "@/lib/types/domain";

interface OkrProgressBarProps {
  percent: number;
  status?: string;
  /** Quando a API envia saúde por ritmo, a cor da barra segue o slug de saúde. */
  healthSlug?: PaceHealthSlug | null;
  showLabel?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

function getTrackColorFromHealth(slug: PaceHealthSlug, percent: number): string {
  if (slug === "off_track") return "bg-red-500";
  if (slug === "at_risk") return "bg-amber-500";
  if (slug === "on_track" || slug === "ahead") return "bg-emerald-500";
  if (slug === "completed_legacy" || percent >= 100) return "bg-blue-500";
  if (slug === "draft" || slug === "no_dates" || slug === "not_started") return "bg-zinc-400";
  return "bg-zinc-400";
}

function getTrackColor(
  status?: string,
  percent?: number,
  healthSlug?: PaceHealthSlug | null,
): string {
  if (healthSlug) return getTrackColorFromHealth(healthSlug, percent ?? 0);
  if (status === "completed" || (percent ?? 0) >= 100) return "bg-blue-500";
  if (status === "on_track") return "bg-emerald-500";
  if (status === "at_risk") return "bg-amber-500";
  if (status === "off_track") return "bg-red-500";
  if ((percent ?? 0) >= 70) return "bg-emerald-500";
  if ((percent ?? 0) >= 40) return "bg-amber-500";
  return "bg-zinc-400";
}

export function OkrProgressBar({
  percent,
  status,
  healthSlug,
  showLabel = false,
  size = "sm",
  className,
}: OkrProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const trackColor = getTrackColor(status, clamped, healthSlug);

  const heights: Record<string, string> = {
    xs: "h-1",
    sm: "h-1.5",
    md: "h-2",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 overflow-hidden rounded-full bg-muted", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", trackColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}

interface MiniProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  status?: string;
}

export function MiniProgressRing({
  percent,
  size = 32,
  strokeWidth = 3,
  status,
}: MiniProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (clamped / 100) * circumference;

  const colors: Record<string, string> = {
    completed: "#3b82f6",
    on_track: "#10b981",
    at_risk: "#f59e0b",
    off_track: "#ef4444",
  };
  const color = status ? (colors[status] ?? "#94a3b8") : "#10b981";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
      />
    </svg>
  );
}
