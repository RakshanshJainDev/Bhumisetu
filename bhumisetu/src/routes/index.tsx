import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanText,
  Languages,
  PenLine,
  Gauge,
  UserCheck,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { PublicLayout } from "@/components/bhumisetu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BHUMISETU — Intelligent Land Record Digitization & Verification" },
      {
        name: "description",
        content:
          "Digitize, validate and securely access land records with AI-powered document processing, confidence scoring and human verification.",
      },
      { property: "og:title", content: "BHUMISETU — Land Record Digitization & Verification" },
      {
        property: "og:description",
        content:
          "AI-powered OCR, multilingual extraction, confidence scoring and verified public land-record search.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: ScanText, title: "AI OCR", text: "Reads scanned land records and extracts every field." },
  {
    icon: Languages,
    title: "Multilingual OCR",
    text: "English, Hindi, Gujarati, Marathi, Tamil and mixed-language pages.",
  },
  {
    icon: PenLine,
    title: "Handwriting Recognition",
    text: "Handles handwritten entries alongside printed text.",
  },
  {
    icon: Gauge,
    title: "Confidence Scoring",
    text: "Every field carries its own certainty score and status.",
  },
  {
    icon: UserCheck,
    title: "Human Verification",
    text: "Low-confidence documents go to a reviewer before publishing.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Digital Records",
    text: "Only verified records become publicly searchable.",
  },
];

const STEPS = [
  ["Upload", "A scanned record is uploaded as an image or PDF."],
  ["OCR", "The document is read by AI, including handwriting."],
  ["Extract", "Owner, survey number, area, village and more are pulled out."],
  ["Confidence", "Each field gets a certainty score out of 100."],
  ["Verify", "Above 80% everywhere it is auto-verified; otherwise a person reviews it."],
  ["Store", "The verified record is written to the land-record database."],
  ["Search", "Anyone can search and open the verified record."],
];

function Home() {
  return (
    <PublicLayout>
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <span className="inline-flex rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold tracking-wide text-gold">
            SIH 2026 · SIH26018 Prototype
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-[0.16em] md:text-6xl">BHUMISETU</h1>
          <p className="mt-3 text-lg text-gold md:text-xl">
            Intelligent Land Record Digitization &amp; Verification
          </p>
          <p className="mt-5 max-w-2xl text-primary-foreground/80">
            Digitize, validate and securely access land records with AI-powered document
            processing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 font-semibold text-gold-foreground transition-opacity hover:opacity-90"
            >
              Search Land Records <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/primary/login"
              className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 px-6 py-3 font-semibold transition-colors hover:bg-primary-foreground/10"
            >
              Primary User Login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold text-primary">What BHUMISETU does</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <f.icon className="h-6 w-6 text-gold" />
              <h3 className="mt-3 font-semibold text-primary">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold text-primary">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold text-primary">{title}</span>
                  <span className="text-sm text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </PublicLayout>
  );
}
