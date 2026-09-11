import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CONFIDENCE_THRESHOLD,
  DB_COLUMN,
  FIELD_KEYS,
  REQUIRED_FIELDS,
  type FieldKey,
  type OcrFields,
} from "@/lib/bhumisetu";

const fieldSchema = z
  .object({
    value: z.union([z.string(), z.number(), z.null()]).optional(),
    confidence: z.union([z.number(), z.string(), z.null()]).optional(),
    sourceText: z.union([z.string(), z.null()]).optional(),
    needsReview: z.boolean().optional(),
  })
  .passthrough();

const geminiSchema = z.object({
  documentType: z.string().optional().nullable(),
  detectedLanguages: z.array(z.string()).optional().nullable(),
  overallConfidence: z.union([z.number(), z.string()]).optional().nullable(),
  fields: z.record(fieldSchema).optional().nullable(),
});

const PROMPT = `You are an OCR and information-extraction engine for Indian land records.
Read the attached scanned land record (printed and handwritten text). It may be in English, Hindi,
Gujarati, Marathi, Tamil, or a mix of languages.

Return ONLY a JSON object with exactly this shape (no markdown, no commentary):
{
  "documentType": "string",
  "detectedLanguages": ["string"],
  "overallConfidence": 0,
  "fields": {
    "ownerName": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "fatherOrGuardianName": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "surveyNumber": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "landArea": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "landType": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "village": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "taluka": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "district": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "pincode": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "documentNumber": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false },
    "registrationDate": { "value": "", "confidence": 0, "sourceText": "", "needsReview": false }
  }
}

Rules:
- "value" must be transliterated/translated into English script where the source is non-Latin, keeping names faithful.
- "sourceText" is the raw text exactly as it appears in the document (original script).
- "confidence" is an integer 0-100 reflecting how certain you are of that field.
- If a field is absent from the document, use an empty value with confidence 0 and needsReview true.
- Never invent data that is not visible in the document.`;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function normalizeFields(raw: Record<string, unknown> | null | undefined): OcrFields {
  const out = {} as OcrFields;
  for (const key of FIELD_KEYS) {
    const item = (raw?.[key] ?? {}) as Record<string, unknown>;
    const value = str(item["value"]);
    const confidence = value ? num(item["confidence"]) : 0;
    out[key] = {
      value,
      confidence,
      sourceText: str(item["sourceText"]),
      needsReview: !value || confidence < CONFIDENCE_THRESHOLD,
    };
  }
  return out;
}

export function decide(fields: OcrFields) {
  const failing = REQUIRED_FIELDS.filter(
    (k) => !fields[k].value || fields[k].confidence < CONFIDENCE_THRESHOLD,
  );
  return { verified: failing.length === 0, failing };
}

export function recordPayload(fields: OcrFields, documentId: string | null) {
  const payload: Record<string, unknown> = {
    document_id: documentId,
    status: "VERIFIED",
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  (Object.keys(DB_COLUMN) as FieldKey[]).forEach((k) => {
    payload[DB_COLUMN[k]] = fields[k].value || null;
  });
  payload["owner_name"] = fields.ownerName.value || "Unknown";
  payload["survey_number"] = fields.surveyNumber.value || "Unknown";
  return payload;
}

/** Runs Gemini OCR on a stored document and applies the automatic verification decision. */
export const processDocumentOcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI service is not configured.");

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .maybeSingle();
    if (docError) throw new Error(docError.message);
    if (!doc) throw new Error("Document not found.");

    await supabase.from("documents").update({ status: "PROCESSING" }).eq("id", doc.id);
    await supabase.from("audit_logs").insert({
      action: "OCR_STARTED",
      document_id: doc.id,
      user_id: userId,
      details: doc.file_name,
    });

    try {
      const { data: file, error: dlError } = await supabase.storage
        .from("documents")
        .download(doc.file_path);
      if (dlError || !file) throw new Error("Could not read the stored document.");

      const base64 = toBase64(new Uint8Array(await file.arrayBuffer()));
      const isPdf = doc.file_type === "application/pdf";
      const content = isPdf
        ? [
            { type: "text", text: PROMPT },
            {
              type: "file",
              file: {
                filename: doc.file_name,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
          ]
        : [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${doc.file_type};base64,${base64}` },
            },
          ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3.8-flash",
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`AI extraction failed [${response.status}]: ${body.slice(0, 300)}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(cleaned);
      } catch {
        throw new Error("AI returned an unreadable response.");
      }
      const parsed = geminiSchema.parse(parsedRaw);
      const fields = normalizeFields(parsed.fields as Record<string, unknown> | null);
      const languages = (parsed.detectedLanguages ?? []).map(String).filter(Boolean);
      const declared = num(parsed.overallConfidence);
      const computed = Math.round(
        FIELD_KEYS.reduce((sum, k) => sum + fields[k].confidence, 0) / FIELD_KEYS.length,
      );
      const overall = declared || computed;

      const { error: ocrError } = await supabase.from("ocr_results").upsert(
        {
          document_id: doc.id,
          document_type: str(parsed.documentType) || "Land Record",
          detected_languages: languages.length ? languages : ["Unknown"],
          overall_confidence: overall,
          fields: fields as never,
          created_at: new Date().toISOString(),
        },
        { onConflict: "document_id" },
      );
      if (ocrError) throw new Error(ocrError.message);

      await supabase.from("audit_logs").insert({
        action: "OCR_COMPLETED",
        document_id: doc.id,
        user_id: userId,
        details: `Overall confidence ${overall}% · ${languages.join(", ")}`,
      });

      const { verified, failing } = decide(fields);

      if (verified) {
        const { data: rec, error: recError } = await supabase
          .from("land_records")
          .upsert(recordPayload(fields, doc.id) as never, { onConflict: "id" })
          .select("id")
          .single();
        if (recError) throw new Error(recError.message);

        await supabase
          .from("documents")
          .update({ status: "VERIFIED", processed_at: new Date().toISOString() })
          .eq("id", doc.id);
        await supabase.from("audit_logs").insert({
          action: "AUTO_VERIFIED",
          document_id: doc.id,
          record_id: rec.id,
          user_id: userId,
          details: "All required fields at or above 80% confidence",
        });
        return { status: "VERIFIED" as const, overall, failing: [] as string[] };
      }

      const reason = `Low confidence on: ${failing.join(", ")}`;
      await supabase.from("verification_queue").upsert(
        { document_id: doc.id, reason, status: "PENDING", resolved_at: null },
        { onConflict: "document_id" },
      );
      await supabase
        .from("documents")
        .update({ status: "NEEDS_REVIEW", processed_at: new Date().toISOString() })
        .eq("id", doc.id);
      await supabase.from("audit_logs").insert({
        action: "MANUAL_REVIEW_CREATED",
        document_id: doc.id,
        user_id: userId,
        details: reason,
      });
      return { status: "NEEDS_REVIEW" as const, overall, failing };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase.from("documents").update({ status: "OCR_FAILED" }).eq("id", doc.id);
      await supabase.from("audit_logs").insert({
        action: "OCR_FAILED",
        document_id: doc.id,
        user_id: userId,
        details: message.slice(0, 300),
      });
      throw new Error(message);
    }
  });

/** Human approval: writes the corrected extraction into the public land-record database. */
export const approveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: ocr, error } = await supabase
      .from("ocr_results")
      .select("fields")
      .eq("document_id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ocr) throw new Error("No extraction found for this document.");

    const fields = ocr.fields as unknown as OcrFields;
    const missing = REQUIRED_FIELDS.filter((k) => !fields?.[k]?.value?.trim());
    if (missing.length) {
      throw new Error(`Please fill required fields before approving: ${missing.join(", ")}`);
    }

    const { data: existing } = await supabase
      .from("land_records")
      .select("id")
      .eq("document_id", data.documentId)
      .maybeSingle();

    const payload = recordPayload(fields, data.documentId);
    let recordId: string;
    if (existing) {
      const { error: upErr } = await supabase
        .from("land_records")
        .update(payload as never)
        .eq("id", existing.id);
      if (upErr) throw new Error(upErr.message);
      recordId = existing.id;
    } else {
      const { data: inserted, error: inErr } = await supabase
        .from("land_records")
        .insert(payload as never)
        .select("id")
        .single();
      if (inErr) throw new Error(inErr.message);
      recordId = inserted.id;
    }

    const { error: docErr } = await supabase
      .from("documents")
      .update({ status: "VERIFIED", processed_at: new Date().toISOString() })
      .eq("id", data.documentId);
    if (docErr) throw new Error(docErr.message);

    await supabase
      .from("verification_queue")
      .update({ status: "RESOLVED", resolved_at: new Date().toISOString(), assigned_to: userId })
      .eq("document_id", data.documentId);

    await supabase.from("audit_logs").insert({
      action: "RECORD_VERIFIED",
      document_id: data.documentId,
      record_id: recordId,
      user_id: userId,
      details: "Approved after manual verification",
    });

    return { recordId };
  });

/** Human rejection: keeps the document, removes it from public search. */
export const rejectDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ documentId: z.string().uuid(), reason: z.string().max(300).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("documents")
      .update({ status: "REJECTED", processed_at: new Date().toISOString() })
      .eq("id", data.documentId);
    if (error) throw new Error(error.message);

    await supabase
      .from("land_records")
      .update({ status: "REJECTED", updated_at: new Date().toISOString() })
      .eq("document_id", data.documentId);

    await supabase
      .from("verification_queue")
      .update({ status: "REJECTED", resolved_at: new Date().toISOString(), assigned_to: userId })
      .eq("document_id", data.documentId);

    await supabase.from("audit_logs").insert({
      action: "RECORD_REJECTED",
      document_id: data.documentId,
      user_id: userId,
      details: data.reason || "Rejected during manual verification",
    });

    return { ok: true };
  });
