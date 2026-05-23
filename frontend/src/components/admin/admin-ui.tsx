import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "gold" | "success" | "warning";
}) {
  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    gold: "text-[color:var(--gold)] bg-[color:var(--gold)]/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  };
  return (
    <div className="rounded-2xl bg-gradient-card border border-border/60 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentMap[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function CanteenSelector({
  value,
  onChange,
  canteens,
}: {
  value: number;
  onChange: (v: number) => void;
  canteens: ReadonlyArray<{ id: number; name: string }>;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {canteens.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
            value === c.id
              ? "border-primary bg-primary text-primary-foreground shadow-glow"
              : "border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-gradient-card border border-border/60 p-12 text-center text-muted-foreground">
      <div className="text-5xl mb-3">📭</div>
      <div className="font-semibold text-foreground">{title}</div>
      {hint && <div className="text-sm mt-1">{hint}</div>}
    </div>
  );
}
