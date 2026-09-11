import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StateBlock, StatusBadge } from "@/components/bhumisetu";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/primary/_app/land-records")({
  head: () => ({
    meta: [
      { title: "Land Records — BHUMISETU" },
      { name: "description", content: "All digitised land records with 24-hour correction requests." },
      { property: "og:title", content: "Land Records — BHUMISETU" },
      { property: "og:description", content: "Browse verified land records and request corrections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandRecords,
});

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

type Change = { field: string; oldValue: string | null; newValue: string; reason: string };

function readChange(raw: unknown): Change {
  const c = (raw ?? {}) as Partial<Change>;
  return {
    field: c.field ?? "unknown",
    oldValue: c.oldValue ?? null,
    newValue: c.newValue ?? "",
    reason: c.reason ?? "Correction requested",
  };
}

function LandRecords() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const records = useQuery({
    queryKey: ["land-records", term, page],
    queryFn: async () => {
      let q = supabase
        .from("land_records")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (term.trim()) {
        const t = `%${term.trim()}%`;
        q = q.or(`owner_name.ilike.${t},survey_number.ilike.${t},village.ilike.${t}`);
      }
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const requests = useQuery({
    queryKey: ["change-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_requests")
        .select("*")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const request = requests.data?.find((r) => r.id === id);
      if (!request) throw new Error("Request not found.");
      const change = readChange(request.requested_changes);
      const { data: auth } = await supabase.auth.getUser();
      if (approved) {
        const { error } = await supabase
          .from("land_records")
          .update({ [change.field]: change.newValue } as never)
          .eq("id", request.record_id);
        if (error) throw new Error(error.message);
      }
      const { error: upErr } = await supabase
        .from("change_requests")
        .update({ status: approved ? "APPROVED" : "REJECTED" })
        .eq("id", id);
      if (upErr) throw new Error(upErr.message);
      await supabase.from("audit_logs").insert({
        action: approved ? "CHANGE_REQUEST_APPROVED" : "CHANGE_REQUEST_REJECTED",
        record_id: request.record_id,
        user_id: auth.user?.id ?? null,
        details: `${change.field}: ${change.oldValue ?? "—"} → ${change.newValue}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change-requests"] });
      qc.invalidateQueries({ queryKey: ["land-records"] });
    },
  });

  const totalPages = Math.max(1, Math.ceil((records.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-primary">Land Records</h1>

      {requests.data?.length ? (
        <section className="rounded-lg border border-review/40 bg-review/10 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Pending change requests</h2>
          <ul className="mt-3 space-y-2">
            {requests.data.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{readChange(r.requested_changes).field}</span>:{" "}
                  {readChange(r.requested_changes).oldValue ?? "—"} →{" "}
                  <span className="font-medium">{readChange(r.requested_changes).newValue}</span>
                  <span className="block text-xs text-muted-foreground">
                    {readChange(r.requested_changes).reason}
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, approved: true })}
                    className="rounded-md bg-verified px-3 py-1.5 text-xs font-semibold text-verified-foreground disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, approved: false })}
                    className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground disabled:opacity-60"
                  >
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setPage(0);
        }}
        placeholder="Search owner, survey number or village"
        className="w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-sm"
      />

      <StateBlock
        loading={records.isLoading}
        error={records.error}
        empty={!records.data?.rows.length}
        emptyText="No land records yet."
      >
        <div className="space-y-3">
          {records.data?.rows.map((r) => {
            const editable = Date.now() - new Date(r.created_at).getTime() < DAY_MS;
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">{r.owner_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Survey {r.survey_number} · {r.village}, {r.taluka}, {r.district}
                      {r.land_area ? ` · ${r.land_area}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                      >
                        {openId === r.id ? "Cancel" : "Request change"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Edit window closed</span>
                    )}
                  </div>
                </div>
                {openId === r.id ? (
                  <ChangeRequestForm
                    record={r as unknown as Record<string, string | null> & { id: string }}
                    onDone={() => {
                      setOpenId(null);
                      qc.invalidateQueries({ queryKey: ["change-requests"] });
                    }}
                  />
                ) : null}
              </div>
            );
          })}
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

const EDITABLE_FIELDS = [
  "owner_name",
  "survey_number",
  "land_area",
  "village",
  "taluka",
  "district",
  "pincode",
  "document_number",
] as const;

function ChangeRequestForm({
  record,
  onDone,
}: {
  record: Record<string, string | null> & { id: string };
  onDone: () => void;
}) {
  const [field, setField] = useState<string>(EDITABLE_FIELDS[0]);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!value.trim()) throw new Error("Please enter the corrected value.");
      const { data: auth } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("change_requests").insert({
        record_id: record.id,
        requested_changes: {
          field,
          oldValue: record[field] ?? null,
          newValue: value.trim(),
          reason: reason.trim() || "Correction requested",
        },
        status: "PENDING",
        requested_by: auth.user?.id ?? null,
      });
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: onDone,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not submit request."),
  });

  return (
    <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
      <select
        value={field}
        onChange={(e) => setField(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        {EDITABLE_FIELDS.map((f) => (
          <option key={f} value={f}>
            {f.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Corrected value"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-danger sm:col-span-3">{error}</p> : null}
      <button
        type="button"
        disabled={submit.isPending}
        onClick={() => submit.mutate()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-3"
      >
        {submit.isPending ? "Submitting…" : "Submit change request"}
      </button>
    </div>
  );
}
