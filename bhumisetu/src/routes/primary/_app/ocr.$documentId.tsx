import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, RefreshCcw } from "lucide-react";
import { StateBlock, StatusBadge } from "@/components/bhumisetu";
import { DocumentPreview, FieldList } from "@/components/doc-review";
import { supabase } from "@/integrations/supabase/client";
import { processDocumentOcr } from "@/lib/ocr.functions";
import type { OcrFields } from "@/lib/bhumisetu";

export const Route = createFileRoute("/primary/_app/ocr/$documentId")({
  head: () => ({
    meta: [
      { title: "Document Extraction — BHUMISETU" },
      { name: "description", content: "AI extraction results with per-field confidence scores." },
      { property: "og:title", content: "Document Extraction — BHUMISETU" },
      { property: "og:description", content: "Read a scanned land record and score every field." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OcrPage,
});

function OcrPage() {
  const { documentId } = Route.useParams();
  const qc = useQueryClient();
  const runOcr = useServerFn(processDocumentOcr);

  const query = useQuery({
    queryKey: ["document", documentId],
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

  const mutation = useMutation({
    mutationFn: () => runOcr({ data: { documentId } }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["document", documentId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-documents"] });
      qc.invalidateQueries({ queryKey: ["queue-preview"] });
    },
  });

  const doc = query.data;
  const ocr = (doc?.ocr as unknown as Record<string, unknown> | null) ?? null;
  const fields = (ocr?.["fields"] as OcrFields | undefined) ?? null;
  const processing = mutation.isPending || doc?.status === "PROCESSING";

  return (
    <div className="space-y-6">
      <StateBlock
        loading={query.isLoading}
        error={query.error}
        empty={!query.isLoading && !doc}
        emptyText="This document no longer exists."
      >
        {doc ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-primary">{doc.file_name}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <StatusBadge status={doc.status} />
                  <span>Uploaded {new Date(doc.uploaded_at).toLocaleString()}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mutation.mutate()}
                  disabled={processing}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {ocr || doc.status === "OCR_FAILED" ? (
                    <RefreshCcw className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {processing
                    ? "Reading document…"
                    : ocr || doc.status === "OCR_FAILED"
                      ? "Retry OCR"
                      : "Process with Gemini"}
                </button>
                {doc.status === "NEEDS_REVIEW" ? (
                  <Link
                    to="/primary/verification"
                    search={{ documentId }}
                    className="rounded-md border border-border px-4 py-2 text-sm font-semibold"
                  >
                    Go to verification
                  </Link>
                ) : null}
              </div>
            </div>

            {mutation.isError ? (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                Document processing failed. Please try again.
                <span className="mt-1 block text-xs opacity-80">
                  {mutation.error instanceof Error ? mutation.error.message : ""}
                </span>
              </p>
            ) : null}

            {mutation.isSuccess ? (
              <p
                className={`rounded-md border px-4 py-3 text-sm ${
                  mutation.data.status === "VERIFIED"
                    ? "border-verified/30 bg-verified/10 text-verified"
                    : "border-review/40 bg-review/10 text-review-foreground"
                }`}
              >
                {mutation.data.status === "VERIFIED"
                  ? `Automatically verified at ${mutation.data.overall}% overall confidence. The record is now publicly searchable.`
                  : `Sent to the verification queue — low confidence on: ${mutation.data.failing.join(", ")}.`}
              </p>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <DocumentPreview
                filePath={doc.file_path}
                fileType={doc.file_type}
                fileName={doc.file_name}
              />
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Extracted information
                  </p>
                  {ocr ? (
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Document type: </span>
                        <span className="font-medium">{String(ocr["document_type"] ?? "—")}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Detected languages: </span>
                        <span className="font-medium">
                          {(ocr["detected_languages"] as string[] | null)?.join(", ") || "—"}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Overall confidence: </span>
                        <span className="font-medium">
                          {Math.round(Number(ocr["overall_confidence"] ?? 0))}%
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Not processed yet. Run the extraction to read this document.
                    </p>
                  )}
                </div>
                {ocr ? <FieldList fields={fields} /> : null}
              </div>
            </div>
          </>
        ) : null}
      </StateBlock>
    </div>
  );
}
