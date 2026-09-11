import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ACCEPTED_TYPES, MAX_FILE_BYTES } from "@/lib/bhumisetu";

export const Route = createFileRoute("/primary/_app/upload")({
  head: () => ({
    meta: [
      { title: "Upload Land Record — BHUMISETU" },
      { name: "description", content: "Upload a scanned land record as PDF, JPG, PNG or WEBP." },
      { property: "og:title", content: "Upload Land Record — BHUMISETU" },
      { property: "og:description", content: "Add a scanned land record for AI extraction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function pick(next: File | null) {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!next) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(next.type)) {
      setFile(null);
      setPreview(null);
      setError("Unsupported file type. Please choose a PDF, JPG, PNG or WEBP file.");
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      setFile(null);
      setPreview(null);
      setError("File is too large. The limit is 15 MB.");
      return;
    }
    setFile(next);
    setPreview(next.type === "application/pdf" ? null : URL.createObjectURL(next));
  }

  async function handleUpload() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");

      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upError) throw new Error(upError.message);

      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_path: path,
          status: "UPLOADED",
          uploaded_by: userId,
        })
        .select("id")
        .single();
      if (dbError) throw new Error(dbError.message);

      await supabase.from("audit_logs").insert({
        action: "DOCUMENT_UPLOADED",
        document_id: doc.id,
        user_id: userId,
        details: file.name,
      });

      navigate({ to: "/primary/ocr/$documentId", params: { documentId: doc.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Upload Land Record</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF, JPG, JPEG, PNG or WEBP up to 15 MB. The file is stored securely and then read by AI.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-gold bg-gold/10" : "border-border bg-card"
        }`}
      >
        <UploadCloud className="mx-auto h-10 w-10 text-gold" />
        <p className="mt-3 text-sm font-medium">Drag and drop a scanned record here</p>
        <p className="text-xs text-muted-foreground">or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-md border border-border px-4 py-2 text-sm font-semibold"
        >
          Select file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {file ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
              </p>
            </div>
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={busy}
              aria-label="Remove file"
              className="rounded-md border border-border p-1.5 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {preview ? (
            <img src={preview} alt="Selected document" className="mt-4 max-h-80 w-auto rounded" />
          ) : (
            <p className="mt-4 rounded bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
              PDF selected — preview available after upload.
            </p>
          )}
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy}
            className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload & continue"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
