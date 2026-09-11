import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { StateBlock, StatusBadge } from "@/components/bhumisetu";
import { DocumentPreview, FieldList } from "@/components/doc-review";
import { supabase } from "@/integrations/supabase/client";
import { approveDocument, rejectDocument } from "@/lib/ocr.functions";
import { CONFIDENCE_THRESHOLD, type FieldKey, type OcrFields } from "@/lib/bhumisetu";

export const Route = createFileRoute("/primary/_app/verification")({
  validateSearch: z.object({ documentId: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verification Queue — BHUMISETU" },
      { name: "description", content: "Review, correct and approve low-confidence land records." },
      { property: "og:title", content: "Verification Queue — BHUMISETU" },
      { property: "og:description", content: "Human verification of AI-extracted land records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationPage,
});

function VerificationPage() {
  const navigate = useNavigate();
  const { documentId } = Route.useSearch();
  const qc = useQueryClient();

  const queue = useQuery({
    queryKey: ["verification-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_queue")
        .select("id, reason, created_at, document_id, status")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const ids = (data ?? []).map((q) => q.document_id);
      const { data: docs } = ids.length
        ? await supabase.from("documents").select("id, file_name").in("id", ids)
        : { data: [] };
      const names = new Map((docs ?? []).map((d) => [d.id, d.file_name]));
      return (data ?? []).map((q) => ({ ...q, file_name: names.get(q.document_id) ?? "Document" }));
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Verification</h1>

      {documentId ? (
        <ReviewPanel
          documentId={documentId}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["verification-queue"] });
            navigate({ to: "/primary/verification", search: {} });
          }}
        />
      ) : (
        <StateBlock
          loading={queue.isLoading}
          error={queue.error}
          empty={!queue.data?.length}
          emptyText="The verification queue is empty."
        >
          <ul className="space-y-2">
            {queue.data?.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span>
                  <span className="font-semibold">
                    {q.file_name}
                  </span>
                  <span className="block text-xs text-muted-foreground">{q.reason}</span>
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={q.status} />
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/primary/verification",
                        search: { documentId: q.document_id },
                      })
                    }
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                  >
                    Review
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </StateBlock>
      )}
    </div>
  );
}

function ReviewPanel({ documentId, onDone }: { documentId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveDocument);
  const reject = useServerFn(rejectDocument);
  const [fields, setFields] = useState<OcrFields | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["review-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const { data: ocrRow, error: ocrErr } = await supabase
        .from("ocr_results")
        .select("*")
        .eq("document_id", documentId)
        .maybeSingle();
      if (ocrErr) throw new Error(ocrErr.message);
      return data ? { ...data, ocr: ocrRow } : null;
    },
  });

  const doc = query.data;
  const ocr = (doc?.ocr as unknown as Record<string, unknown> | null) ?? null;

  useEffect(() => {
    if (ocr && !fields) setFields(ocr["fields"] as OcrFields);
  }, [ocr, fields]);

  const save = useMutation({
    mutationFn: async () => {
      if (!fields) throw new Error("Nothing to save.");
      const { error } = await supabase
        .from("ocr_results")
        .update({ fields: fields as never })
        .eq("document_id", documentId);
      if (error) throw new Error(error.message);
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        action: "FIELD_EDITED",
        document_id: documentId,
        user_id: auth.user?.id ?? null,
        details: "Corrections saved by reviewer",
      });
    },
    onSuccess: () => {
      setError(null);
      setMessage("Corrections saved.");
      qc.invalidateQueries({ queryKey: ["review-document", documentId] });
    },
    onError: (e) => {
      setMessage(null);
      setError(e instanceof Error ? e.message : "Could not save corrections.");
    },
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return approve({ data: { documentId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-documents"] });
      onDone();
    },
    onError: (e) => {
      setMessage(null);
      setError(e instanceof Error ? e.message : "Approval failed.");
    },
  });

  const rejectMut = useMutation({
    mutationFn: () => reject({ data: { documentId, reason: "Rejected by reviewer" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onDone();
    },
    onError: (e) => {
      setMessage(null);
      setError(e instanceof Error ? e.message : "Rejection failed.");
    },
  });

  const busy = save.isPending || approveMut.isPending || rejectMut.isPending;

  return (
    <StateBlock
      loading={query.isLoading}
      error={query.error}
      empty={!query.isLoading && !doc}
      emptyText="Document not found."
    >
      {doc ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">{doc.file_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fields below {CONFIDENCE_THRESHOLD}% need a human check before publishing.
              </p>
            </div>
            <StatusBadge status={doc.status} />
          </div>

          {error ? (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-md border border-verified/30 bg-verified/10 px-4 py-3 text-sm text-verified">
              {message}
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <DocumentPreview
              filePath={doc.file_path}
              fileType={doc.file_type}
              fileName={doc.file_name}
            />
            <div className="space-y-3">
              <FieldList
                fields={fields}
                editable
                onChange={(key: FieldKey, value: string) =>
                  setFields((prev) =>
                    prev ? { ...prev, [key]: { ...prev[key], value } } : prev,
                  )
                }
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save.mutate()}
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {save.isPending ? "Saving…" : "Save corrections"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => approveMut.mutate()}
                  className="rounded-md bg-verified px-4 py-2 text-sm font-semibold text-verified-foreground disabled:opacity-60"
                >
                  {approveMut.isPending ? "Approving…" : "Approve & publish"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => rejectMut.mutate()}
                  className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground disabled:opacity-60"
                >
                  {rejectMut.isPending ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </StateBlock>
  );
}
