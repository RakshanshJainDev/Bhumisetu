import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/bhumisetu";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About BHUMISETU — SIH 2026 Prototype" },
      {
        name: "description",
        content:
          "BHUMISETU is a Smart India Hackathon 2026 prototype for intelligent land record digitization and validation (SIH26018).",
      },
      { property: "og:title", content: "About BHUMISETU" },
      {
        property: "og:description",
        content: "A prototype for intelligent land record digitization and validation.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold text-primary">About BHUMISETU</h1>
        <p className="text-muted-foreground">
          BHUMISETU is a working prototype built for Smart India Hackathon 2026, problem statement
          SIH26018 — Intelligent Land Record Digitization and Validation System. It shows how
          decades of scanned paper land records can be converted into structured, searchable and
          trustworthy digital entries.
        </p>
        <p className="text-muted-foreground">
          Scanned records are read by an AI model that returns structured fields with a confidence
          score for each one. High-confidence documents are verified automatically. Anything
          uncertain is routed to a human reviewer who can see the original scan next to the
          extracted values and correct them before publishing.
        </p>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold text-primary">Disclaimer</h2>
          <p className="mt-1 text-muted-foreground">
            BHUMISETU is not an official government application and issues no legal document. All
            demo records shown in public search are fictional and used only for demonstration.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
