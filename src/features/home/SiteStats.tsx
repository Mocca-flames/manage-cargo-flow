import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "./home.css";

type SiteKey = "all" | "za" | "bw";

interface SiteStatsData {
  totals: { visits: number; pageViews: number };
  devices: { name: string; visits: number }[];
  countries: { name: string; visits: number }[];
  pages: { path: string; views: number }[];
  daily: { date: string; visits: number; views: number }[];
}

const SITES: { key: SiteKey; label: string }[] = [
  { key: "all", label: "All sites" },
  { key: "za", label: ".co.za" },
  { key: "bw", label: ".co.bw" },
];

const DEVICE_COLORS: Record<string, string> = {
  mobile: "var(--brand)",
  desktop: "var(--brand-alt)",
  tablet: "var(--muted)",
};

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function SiteStats() {
  const [site, setSite] = useState<SiteKey>("all");

  const { data, error, isPending, isError, refetch } = useQuery({
    queryKey: ["site-stats", site],
    queryFn: async (): Promise<SiteStatsData> => {
      const res = await fetch(`/api/analytics?site=${site}`);
      if (!res.ok) throw new Error(`request failed (${res.status})`);
      return (await res.json()) as SiteStatsData;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const deviceTotal = data?.devices.reduce((sum, d) => sum + d.visits, 0) ?? 0;
  const maxVisits = Math.max(1, ...(data?.daily.map((d) => d.visits) ?? [0]));
  const dailyVisits = data?.daily.reduce((sum, d) => sum + d.visits, 0) ?? 0;

  return (
    <section className="home-stats" aria-labelledby="home-stats-title">
      <div className="home-stats__header">
        <h2 id="home-stats-title">Website traffic</h2>
        <div className="home-stats__toggle" role="group" aria-label="Filter by site">
          {SITES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`home-stats__seg${site === s.key ? " home-stats__seg--on" : ""}`}
              aria-pressed={site === s.key}
              onClick={() => setSite(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isPending && <p className="muted">Loading stats…</p>}

      {isError && !isPending && (
        <div className="card">
          <p className="error-text">Could not load website stats.</p>
          {import.meta.env.DEV && (
            <p className="muted">The analytics endpoint only exists in the deployed build.</p>
          )}
          <p className="muted">{error instanceof Error ? error.message : ""}</p>
          <button type="button" className="btn btn--sm" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {data && !isPending && !isError && (
        <>
          <div className="home-stats__cards">
            <div className="card home-stats__card">
              <span className="muted">Visits · 7 days</span>
              <b className="home-stats__num">{data.totals.visits.toLocaleString()}</b>
            </div>
            <div className="card home-stats__card">
              <span className="muted">Page views · 7 days</span>
              <b className="home-stats__num">{data.totals.pageViews.toLocaleString()}</b>
            </div>
          </div>

          <div className="card">
            <b>Devices · 7 days</b>
            {deviceTotal === 0 ? (
              <p className="muted">No visits in the last 7 days.</p>
            ) : (
              <>
                <div className="home-stats__segbar" aria-hidden="true">
                  {data.devices.map((d) => (
                    <span
                      key={d.name}
                      style={{
                        width: `${percent(d.visits, deviceTotal)}%`,
                        background: DEVICE_COLORS[d.name] ?? "var(--muted)",
                      }}
                    />
                  ))}
                </div>
                <ul className="home-stats__legend">
                  {data.devices.map((d) => (
                    <li key={d.name}>
                      <span
                        className="home-stats__dot"
                        style={{ background: DEVICE_COLORS[d.name] ?? "var(--muted)" }}
                      />
                      <span className="home-stats__legend-label">{d.name}</span>
                      <span className="muted">
                        {d.visits.toLocaleString()} ({percent(d.visits, deviceTotal)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="grid-2">
            <div className="card">
              <b>Top countries · 7 days</b>
              {data.countries.length === 0 ? (
                <p className="muted">No data.</p>
              ) : (
                <ul className="home-stats__list">
                  {data.countries.map((c) => (
                    <li key={c.name}>
                      <span>{c.name}</span>
                      <span className="muted">{c.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card">
              <b>Top pages · 7 days</b>
              {data.pages.length === 0 ? (
                <p className="muted">No data.</p>
              ) : (
                <ul className="home-stats__list">
                  {data.pages.map((p) => (
                    <li key={p.path}>
                      <span className="home-stats__path">{p.path}</span>
                      <span className="muted">{p.views.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <b>Visits · last 14 days</b>
            <div className="home-stats__spark">
              {data.daily.map((d) => (
                <span
                  key={d.date}
                  className={`home-stats__spark-bar${d.visits === 0 ? " home-stats__spark-bar--empty" : ""}`}
                  style={{
                    height: `${Math.max(percent(d.visits, maxVisits), d.visits > 0 ? 8 : 3)}%`,
                  }}
                  title={`${d.date}: ${d.visits} visits`}
                />
              ))}
            </div>
            <p className="muted home-stats__footnote">
              {dailyVisits.toLocaleString()} visits in 14 days · counts are approximate
            </p>
          </div>
        </>
      )}
    </section>
  );
}
