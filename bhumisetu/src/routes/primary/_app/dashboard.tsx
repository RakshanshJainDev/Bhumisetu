import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileStack, Loader2, ClipboardCheck, BadgeCheck, XCircle } from "lucide-react";
import { StateBlock, StatusBadge } from "@/components/bhumisetu";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/primary/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BHUMISETU Primary Workspace" },
      { name: "description", content: "Document statistics, recent uploads and the verification queue." },
      { property: "og:title", content: "Dashboard — BHUMISETU" },
      { property: "og:description", content: "BHUMISETU primary user workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type DocRow = {
  id: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  ocr_results: { overall_confidence: number }[] | null;
};

function Dashboard() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const statuses = ["PROCESSING", "NEEDS_REVIEW", "VERIFIED", "REJECTED"];
      const total = await supabase.from("documents").select("id", { count: "exact", head: true });
      if (total.error) throw new Error(total.error.message);
      const counts: Record<string, number> = {};
      for (const s of statuses) {
        const r = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        if (r.error) throw new Error(r.error.message);
        counts[s] = r.count ?? 0;
      }
      return { total: total.count ?? 0, counts };
    },
  });

  const recent = useQuery({
    queryKey: ["recent-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, status, uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(8);
      if (error) throw new Error(error.message);
      const ids = (data ?? []).map((d) => d.id);
      const { data: ocr } = ids.length
        ? await supabase
            .from("ocr_results")
            .select("document_id, overall_confidence")
            .in("document_id", ids)
        : { data: [] };
      const byDoc = new Map((ocr ?? []).map((o) => [o.document_id, o.overall_confidence]));
      return (data ?? []).map((d) => ({ ...d, confidence: byDoc.get(d.id) ?? null }));
    },
  });

  const queue = useQuery({
    queryKey: ["queue-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_queue")
        .select("id, reason, created_at, document_id")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      const ids = (data ?? []).map((q) => q.document_id);
      const { data: docs } = ids.length
        ? await supabase.from("documents").select("id, file_name").in("id", ids)
        : { data: [] };
      const names = new Map((docs ?? []).map((d) => [d.id, d.file_name]));
      return (data ?? []).map((q) => ({ ...q, file_name: names.get(q.document_id) ?? "Document" }));
    },
  });

  const cards = [
    { label: "Total Documents", value: stats.data?.total ?? 0, icon: FileStack },
    { label: "Processing", value: stats.data?.counts["PROCESSING"] ?? 0, icon: Loader2 },
    { label: "Needs Verification", value: stats.data?.counts["NEEDS_REVIEW"] ?? 0, icon: ClipboardCheck },
    { label: "Verified Records", value: stats.data?.counts["VERIFIED"] ?? 0, icon: BadgeCheck },
    { label: "Rejected", value: stats.data?.counts["REJECTED"] ?? 0, icon: XCircle },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <Link
          to="/primary/upload"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Upload document
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <c.icon className="h-5 w-5 text-gold" />
            <p className="mt-3 text-2xl font-bold tabular-nums text-primary">
              {stats.isLoading ? "—" : c.value}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-primary">Recent Documents</h2>
        <StateBlock
          loading={recent.isLoading}
          error={recent.error}
          empty={!recent.data?.length}
          emptyText="No documents uploaded yet."
        >
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.data?.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="max-w-[240px] truncate px-4 py-3 font-medium">{d.file_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(d.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {d.confidence != null ? `${Math.round(Number(d.confidence))}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/primary/ocr/$documentId"
                        params={{ documentId: d.id }}
                        className="font-semibold text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StateBlock>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Verification Queue</h2>
          <Link to="/primary/verification" className="text-sm font-semibold text-primary hover:underline">
            Open queue
          </Link>
        </div>
        <StateBlock
          loading={queue.isLoading}
          error={queue.error}
          empty={!queue.data?.length}
          emptyText="Nothing waiting for manual review."
        >
          <ul className="space-y-2">
            {queue.data?.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-review/40 bg-review/10 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-semibold">
                    {q.file_name}
                  </span>
                  <span className="block text-xs text-muted-foreground">{q.reason}</span>
                </span>
                <Link
                  to="/primary/verification"
                  search={{ documentId: q.document_id }}
                  className="font-semibold text-primary hover:underline"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </StateBlock>
      </section>
    </div>
  );
}
