import { fetchVenues, type Venue } from "@/lib/api";

// The API is queried on every request, never at build time — the dashboard
// must show what the admin saved, not what was true when the image was built.
export const dynamic = "force-dynamic";

export default async function Home() {
  let venues: Venue[] = [];
  let error: string | null = null;

  try {
    ({ venues } = await fetchVenues());
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Unknown error";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Revenue Trend Dashboard
        </h1>
        <p className="text-sm text-neutral-500">
          Walking skeleton. The chart, the KPI cards and the admin area are not
          built yet — this page only proves the frontend reaches the API.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          API connection
        </h2>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Could not reach the API: {error}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {venues.map((venue) => (
              <li
                key={venue.id}
                className="rounded-lg border border-neutral-200 px-4 py-3 text-sm"
              >
                <span className="font-medium">{venue.name}</span>
                <span className="text-neutral-500">
                  {" "}
                  — {venue.trading_days_recorded} trading days recorded (
                  {venue.timezone})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
