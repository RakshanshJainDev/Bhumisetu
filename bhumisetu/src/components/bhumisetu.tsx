import { Link, useRouterState } from "@tanstack/react-router";
import { Landmark, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { confidenceLabel, confidenceTone } from "@/lib/bhumisetu";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search Land Records" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About" },
  { to: "/help", label: "Help" },
];

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md",
          light ? "bg-gold text-gold-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <Landmark className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-lg font-bold tracking-[0.18em]",
            light ? "text-primary-foreground" : "text-primary",
          )}
        >
          BHUMISETU
        </span>
        <span
          className={cn(
            "block text-[11px]",
            light ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          Intelligent Land Record Digitization &amp; Verification
        </span>
      </span>
    </Link>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
                  path === item.to ? "bg-secondary text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/primary/login"
              className="ml-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Primary Login
            </Link>
          </nav>
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-border p-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {open ? (
          <nav className="border-t border-border bg-card px-4 py-2 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/primary/login"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Primary Login
            </Link>
          </nav>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm">
          <p className="font-semibold tracking-[0.18em]">BHUMISETU</p>
          <p className="mt-2 max-w-2xl text-primary-foreground/70">
            A prototype built for Smart India Hackathon 2026 (SIH26018). BHUMISETU is not an
            official government application and does not issue legal land documents. All demo
            records are fictional.
          </p>
        </div>
      </footer>
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  VERIFIED: "bg-verified/15 text-verified border-verified/30",
  PROCESSING: "bg-primary/10 text-primary border-primary/25",
  UPLOADED: "bg-muted text-muted-foreground border-border",
  NEEDS_REVIEW: "bg-review/20 text-review-foreground border-review/40",
  PENDING: "bg-review/20 text-review-foreground border-review/40",
  REJECTED: "bg-danger/15 text-danger border-danger/30",
  OCR_FAILED: "bg-danger/15 text-danger border-danger/30",
  RESOLVED: "bg-verified/15 text-verified border-verified/30",
  EXPIRED: "bg-muted text-muted-foreground border-border",
  APPROVED: "bg-verified/15 text-verified border-verified/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASS[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

const BAR_CLASS: Record<string, string> = {
  verified: "bg-verified",
  review: "bg-review",
  danger: "bg-danger",
};

export function ConfidenceBar({ value }: { value: number }) {
  const tone = confidenceTone(value);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums">{value}%</span>
        <span className="text-muted-foreground">{confidenceLabel(value)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", BAR_CLASS[tone])}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function Highlight({ text, term }: { text: string | null; term?: string | undefined }) {
  const value = text ?? "—";
  const q = (term ?? "").trim();
  if (!q || !value.toLowerCase().includes(q.toLowerCase())) return <>{value}</>;
  const start = value.toLowerCase().indexOf(q.toLowerCase());
  return (
    <>
      {value.slice(0, start)}
      <mark className="rounded bg-gold/50 px-0.5 text-foreground">
        {value.slice(start, start + q.length)}
      </mark>
      {value.slice(start + q.length)}
    </>
  );
}

export function StateBlock({
  loading,
  error,
  empty,
  emptyText = "Nothing to show yet.",
  children,
}: {
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
}) {
  if (loading)
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        {error instanceof Error ? error.message : "Something went wrong. Please try again."}
      </p>
    );
  if (empty) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  return <>{children}</>;
}
