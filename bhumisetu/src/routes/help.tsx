import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/bhumisetu";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — BHUMISETU" },
      {
        name: "description",
        content:
          "Answers about searching verified land records, supported file types, confidence scores and the verification queue.",
      },
      { property: "og:title", content: "Help & FAQ — BHUMISETU" },
      {
        property: "og:description",
        content: "How to search records and how documents get verified in BHUMISETU.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Help,
});

const FAQ: Array<[string, string]> = [
  ["Do I need an account to search?", "No. Public search is open to everyone and shows only verified records."],
  ["Why can't I find a record?", "Records appear publicly only after they are verified. A document still in review is not searchable."],
  ["Which files can be uploaded?", "PDF, JPG, JPEG, PNG and WEBP up to 15 MB."],
  ["What does the confidence score mean?", "It is how certain the AI is about one extracted field: 90-100 high, 80-89 acceptable, 50-79 needs review, below 50 very low."],
  ["What happens if reading fails?", "The document is marked as failed and kept safely. A primary user can retry processing at any time."],
  ["Can a verified record be changed?", "Changes to a verified record go through a change request that stays open for 24 hours before it expires."],
];

function Help() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-primary">Help</h1>
        <div className="mt-8 space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-primary">{q}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
