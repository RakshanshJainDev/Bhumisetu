import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/bhumisetu";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — BHUMISETU" },
      {
        name: "description",
        content:
          "From scanned paper to verified public record: upload, AI reading, confidence scoring, verification and search.",
      },
      { property: "og:title", content: "How BHUMISETU Works" },
      {
        property: "og:description",
        content: "The seven steps from a scanned land record to a verified, searchable entry.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const STEPS: Array<[string, string]> = [
  ["1. Upload", "A primary user uploads a scanned land record as JPG, PNG, WEBP or PDF."],
  ["2. OCR", "The stored file is sent to Gemini through a secure server-side function."],
  ["3. Language detection", "Printed and handwritten text is read in English, Hindi, Gujarati, Marathi, Tamil or a mix."],
  ["4. Structured extraction", "Owner, guardian, survey number, area, type, village, taluka, district, pincode, document number and registration date are extracted."],
  ["5. Confidence scoring", "Each field receives a 0-100 certainty score with its source text."],
  ["6. Decision", "If every required field scores 80% or more the record is verified automatically; otherwise it enters the verification queue for human correction."],
  ["7. Publish", "Verified records are written to the land-record database and become publicly searchable immediately."],
];

function HowItWorks() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-primary">How It Works</h1>
        <ol className="mt-8 space-y-4">
          {STEPS.map(([title, text]) => (
            <li key={title} className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-primary">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-lg border border-gold/40 bg-gold/10 p-5 text-sm">
          <p className="font-semibold text-primary">Required fields</p>
          <p className="mt-1 text-muted-foreground">
            Owner Name, Survey Number, Land Area, Village, Taluka and District must all reach 80%
            confidence for automatic verification. The decision is always made on the server.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
