import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  emptyFields,
  type FieldKey,
  type OcrFields,
} from "@/lib/bhumisetu";
import { ConfidenceBar } from "@/components/bhumisetu";

export function DocumentPreview({
  filePath,
  fileType,
  fileName,
}: {
  filePath: string;
  fileType: string;
  fileName: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["signed-url", filePath],
    staleTime: 1000 * 60 * 40,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 60 * 60);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scanned document · {fileName}
      </div>
      <div className="min-h-[320px] bg-muted/40 p-3">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading document…</p>
        ) : error || !data ? (
          <p className="py-16 text-center text-sm text-danger">Could not load the document file.</p>
        ) : fileType === "application/pdf" ? (
          <object data={data} type="application/pdf" className="h-[70vh] w-full rounded">
            <a href={data} className="text-sm font-medium text-primary underline">
              Open the PDF in a new tab
            </a>
          </object>
        ) : (
          <img src={data} alt={fileName} className="mx-auto max-h-[70vh] w-auto rounded" />
        )}
      </div>
    </div>
  );
}

export function FieldList({
  fields,
  editable = false,
  onChange,
}: {
  fields: OcrFields | null;
  editable?: boolean;
  onChange?: (key: FieldKey, value: string) => void;
}) {
  const data = fields ?? emptyFields();
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {FIELD_KEYS.map((key) => {
        const f = data[key] ?? { value: "", confidence: 0, sourceText: "", needsReview: true };
        const required = REQUIRED_FIELDS.includes(key);
        return (
          <div key={key} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {FIELD_LABELS[key]}
                {required ? <span className="ml-1 text-danger">*</span> : null}
              </span>
            </div>
            {editable ? (
              <input
                value={f.value}
                onChange={(e) => onChange?.(key, e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Not detected"
              />
            ) : (
              <p className="mt-1 text-base font-medium">{f.value || "—"}</p>
            )}
            {f.sourceText ? (
              <p className="mt-1 text-xs text-muted-foreground">Source: {f.sourceText}</p>
            ) : null}
            <div className="mt-2">
              <ConfidenceBar value={f.confidence} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
