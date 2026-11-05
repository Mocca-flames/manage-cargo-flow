// Pages Function: GET /api/analytics?site=all|za|bw
// Proxies Cloudflare GraphQL (Web Analytics / RUM) so the API token never
// reaches the browser. Deployed automatically by `wrangler pages deploy`.

interface Env {
  CF_API_TOKEN: string;
}

interface AnalyticsContext {
  request: Request;
  env: Env;
}

interface GqlRow {
  count?: number;
  sum?: { visits?: number } | null;
  dimensions?: Record<string, string | undefined> | null;
}

interface GqlAccount {
  totals?: GqlRow[];
  devices?: GqlRow[];
  countries?: GqlRow[];
  pages?: GqlRow[];
  daily?: GqlRow[];
}

interface GqlResponse {
  data?: {
    viewer?: {
      accounts?: GqlAccount[];
    };
  };
  errors?: Array<{ message?: string }>;
}

const ACCOUNT_ID = "c6db75b31928013cc078904ec745e788";

// Hosts tracked per site. transport.* is intentionally excluded.
const HOSTS: Record<string, string[]> = {
  all: [
    "www.cargoflowafrica.co.za",
    "cargoflowafrica.co.za",
    "www.cargoflowafrica.co.bw",
    "cargoflowafrica.co.bw",
  ],
  za: ["www.cargoflowafrica.co.za", "cargoflowafrica.co.za"],
  bw: ["www.cargoflowafrica.co.bw", "cargoflowafrica.co.bw"],
};

function json(status: number, body: unknown, cacheControl = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
    },
  });
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function buildQuery(hosts: string[], start7: string, start14: string, end: string): string {
  const hostList = JSON.stringify(hosts);
  const filter7 = `bot: 0, requestHost_in: ${hostList}, date_geq: "${start7}", date_leq: "${end}"`;
  const filter14 = `bot: 0, requestHost_in: ${hostList}, date_geq: "${start14}", date_leq: "${end}"`;
  return `query {
    viewer {
      accounts(filter: { accountTag: "${ACCOUNT_ID}" }) {
        totals: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { ${filter7} }) {
          count
          sum { visits }
        }
        devices: rumPageloadEventsAdaptiveGroups(limit: 6, filter: { ${filter7} }, orderBy: [sum_visits_DESC]) {
          sum { visits }
          dimensions { deviceType }
        }
        countries: rumPageloadEventsAdaptiveGroups(limit: 5, filter: { ${filter7} }, orderBy: [sum_visits_DESC]) {
          sum { visits }
          dimensions { countryName }
        }
        pages: rumPageloadEventsAdaptiveGroups(limit: 5, filter: { ${filter7} }, orderBy: [count_DESC]) {
          count
          dimensions { requestPath }
        }
        daily: rumPageloadEventsAdaptiveGroups(limit: 50, filter: { ${filter14} }) {
          count
          sum { visits }
          dimensions { date }
        }
      }
    }
  }`;
}

export const onRequest = async (context: AnalyticsContext): Promise<Response> => {
  const { request, env } = context;

  if (!env.CF_API_TOKEN) {
    return json(500, { error: "CF_API_TOKEN is not configured" });
  }

  const url = new URL(request.url);
  const siteParam = url.searchParams.get("site") ?? "all";
  const hosts = HOSTS[siteParam];
  if (!hosts) {
    return json(400, { error: "site must be one of: all, za, bw" });
  }

  const end = isoDay(0);
  const start7 = isoDay(-6);
  const start14 = isoDay(-13);

  let payload: GqlResponse;
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CF_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: buildQuery(hosts, start7, start14, end) }),
    });
    if (!res.ok) {
      return json(502, { error: `Cloudflare API returned HTTP ${res.status}` });
    }
    payload = (await res.json()) as GqlResponse;
  } catch {
    return json(502, { error: "Could not reach the Cloudflare API" });
  }

  if (payload.errors?.length) {
    return json(502, { error: payload.errors[0]?.message ?? "Cloudflare API error" });
  }

  const account = payload.data?.viewer?.accounts?.[0];
  if (!account) {
    return json(502, { error: "No analytics data for this account" });
  }

  const totalsRow = account.totals?.[0];
  const dailyByDate = new Map<string, GqlRow>();
  for (const row of account.daily ?? []) {
    const date = row.dimensions?.date;
    if (date) dailyByDate.set(date, row);
  }

  const daily: Array<{ date: string; visits: number; views: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const date = isoDay(-i);
    const row = dailyByDate.get(date);
    daily.push({
      date,
      visits: row?.sum?.visits ?? 0,
      views: row?.count ?? 0,
    });
  }

  return json(
    200,
    {
      site: siteParam,
      totals: {
        visits: totalsRow?.sum?.visits ?? 0,
        pageViews: totalsRow?.count ?? 0,
      },
      devices: (account.devices ?? []).map((r) => ({
        name: r.dimensions?.deviceType ?? "unknown",
        visits: r.sum?.visits ?? 0,
      })),
      countries: (account.countries ?? []).map((r) => ({
        name: r.dimensions?.countryName ?? "unknown",
        visits: r.sum?.visits ?? 0,
      })),
      pages: (account.pages ?? []).map((r) => ({
        path: r.dimensions?.requestPath || "/",
        views: r.count ?? 0,
      })),
      daily,
    },
    "public, max-age=60",
  );
};
