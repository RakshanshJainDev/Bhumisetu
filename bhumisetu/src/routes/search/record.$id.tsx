import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { PublicLayout, StateBlock, StatusBadge } from "@/components/bhumisetu";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search/record/$id")({
  head: () => ({
    meta: [
      { title: "Verified Land Record — BHUMISETU" },
      {
        name: "description",
        content: "View a land record verified through the BHUMISETU digitization workflow.",
      },
      { property: "og:title", content: "Verified Land Record — BHUMISETU" },
      {
        property: "og:description",
        content: "Owner, survey number, area and location details of a verified land record.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecordPage,
});

function RecordPage() {
  const { id } = Route.useParams();
  const query = useQuery({
    queryKey: ["public-record", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("land_records")
        .select(
          "id, owner_name, father_or_guardian_name, survey_number, land_area, land_type, village, taluka, district, pincode, document_number, registration_date, status, verified_at",
        )
        .eq("id", id)
        .eq("status", "VERIFIED")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const r = query.data;
  const rows: Array<[string, string | null]> = r
    ? [
        ["Owner Name", r.owner_name],
        ["Father / Guardian Name", r.father_or_guardian_name],
        ["Survey Number", r.survey_number],
        ["Land Area", r.land_area],
        ["Land Type", r.land_type],
        ["Village", r.village],
        ["Taluka", r.taluka],
        ["District", r.district],
        ["Pincode", r.pincode],
        ["Document Number", r.document_number],
        ["Registration Date", r.registration_date],
      ]
    : [];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>

        <div className="mt-4">
          <StateBlock
            loading={query.isLoading}
            error={query.error}
            empty={!query.isLoading && !r}
            emptyText="This record is not available publicly."
          >
            {r ? (
              <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary px-6 py-5 text-primary-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gold">
                      Verified Land Record
                    </p>
                    <h1 className="mt-1 text-2xl font-bold">{r.owner_name}</h1>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-verified px-3 py-1 text-sm font-semibold text-verified-foreground">
                    <BadgeCheck className="h-4 w-4" /> Verified
                  </span>
                </header>
                <dl className="grid gap-px bg-border sm:grid-cols-2">
                  {rows.map(([label, value]) => (
                    <div key={label} className="bg-card px-6 py-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-1 font-medium">{value || "—"}</dd>
                    </div>
                  ))}
                  <div className="bg-card px-6 py-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Verification Status
                    </dt>
                    <dd className="mt-1">
                      <StatusBadge status={r.status} />
                    </dd>
                  </div>
                </dl>
              </article>
            ) : null}
          </StateBlock>
        </div>
      </div>
    </PublicLayout>
  );
}
