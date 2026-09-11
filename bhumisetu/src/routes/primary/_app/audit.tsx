import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StateBlock } from "@/components/bhumisetu";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/primary/_app/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — BHUMISETU" },
      { name: "description", content: "Every upload, extraction, approval and correction is logged." },
      { property: "og:title", content: "Audit Log — BHUMISETU" },
      { property: "og:description", content: "Traceable history of all land record actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

const PAGE_SIZE = 25;

function AuditPage() {
  const [page, setPage] = useState(0);

  const logs = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("timestamp", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((logs.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Audit Log</h1>
      <StateBlock
        loading={logs.isLoading}
        error={logs.error}
        empty={!logs.data?.rows.length}
        emptyText="No activity recorded yet."
      >
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.data?.rows.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{l.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-muted-foreground">
          Page {page + 1} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
