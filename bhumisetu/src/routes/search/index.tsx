import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { Search as SearchIcon, ArrowRight } from "lucide-react";
import { PublicLayout, StateBlock, Highlight } from "@/components/bhumisetu";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search/")({
  head: () => ({
    meta: [
      { title: "Search Verified Land Records — BHUMISETU" },
      {
        name: "description",
        content:
          "Search verified land records by owner name, survey number, village, taluka, district, pincode or document number.",
      },
      { property: "og:title", content: "Search Verified Land Records — BHUMISETU" },
      {
        property: "og:description",
        content: "Public search across land records verified through BHUMISETU.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

const FILTERS = [
  ["ownerName", "Owner Name", "owner_name"],
  ["surveyNumber", "Survey Number", "survey_number"],
  ["village", "Village", "village"],
  ["taluka", "Taluka", "taluka"],
  ["district", "District", "district"],
  ["pincode", "Pincode", "pincode"],
  ["documentNumber", "Document Number", "document_number"],
] as const;

type FormState = Record<string, string>;

const EMPTY: FormState = Object.fromEntries(FILTERS.map(([k]) => [k, ""]));
const PAGE_SIZE = 10;

function SearchPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [applied, setApplied] = useState<FormState>(EMPTY);
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["public-search", applied, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from("land_records")
        .select(
          "id, owner_name, survey_number, village, taluka, district, pincode, land_area, document_number",
          { count: "exact" },
        )
        .eq("status", "VERIFIED");

      for (const [key, , column] of FILTERS) {
        const value = (applied[key] ?? "").trim();
        if (value) q = q.ilike(column, `%${value}%`);
      }

      const { data, error, count } = await q
        .order("owner_name")
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const total = query.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-primary">Search Land Records</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only records verified through BHUMISETU appear here. Partial, case-insensitive matches are
          supported.
        </p>

        <form
          className="mt-6 rounded-lg border border-border bg-card p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setApplied(form);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FILTERS.map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="mb-1 block font-medium text-primary">{label}</span>
                <input
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder={label}
                />
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={query.isFetching}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <SearchIcon className="h-4 w-4" />
              {query.isFetching ? "Searching…" : "Search"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY);
                setApplied(EMPTY);
                setPage(0);
              }}
              className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mt-8">
          <StateBlock
            loading={query.isLoading}
            error={query.error}
            empty={!query.data?.rows.length}
            emptyText="No verified records match this search."
          >
            <p className="mb-3 text-sm text-muted-foreground">
              {total} verified record{total === 1 ? "" : "s"} found
            </p>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Survey No.</th>
                    <th className="px-4 py-3">Village</th>
                    <th className="px-4 py-3">Taluka</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {query.data?.rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">
                        <Highlight text={r.owner_name} term={applied["ownerName"]} />
                      </td>
                      <td className="px-4 py-3">
                        <Highlight text={r.survey_number} term={applied["surveyNumber"]} />
                      </td>
                      <td className="px-4 py-3">
                        <Highlight text={r.village} term={applied["village"]} />
                      </td>
                      <td className="px-4 py-3">
                        <Highlight text={r.taluka} term={applied["taluka"]} />
                      </td>
                      <td className="px-4 py-3">
                        <Highlight text={r.district} term={applied["district"]} />
                      </td>
                      <td className="px-4 py-3">{r.land_area ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/search/record/$id"
                          params={{ id: r.id }}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 ? (
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  disabled={page === 0 || query.isFetching}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md border border-border px-4 py-2 font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-muted-foreground">
                  Page {page + 1} of {pages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= pages || query.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-border px-4 py-2 font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </StateBlock>
        </div>
      </div>
    </PublicLayout>
  );
}
