
const REVISION = '2024-10-15';
const BASE = '/api/klaviyo';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── In-memory result cache (survives re-renders, cleared on page refresh) ───
interface CacheEntry {
  data: any;
  timestamp: number;
}
const resultCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): any | null {
  const entry = resultCache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete resultCache[key];
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  resultCache[key] = { data, timestamp: Date.now() };
}

// ─── Parallel-safe fetch with automatic 429 retry (no artificial delays) ───
const apiFetch = async (url: string, options: RequestInit, retryCount = 0): Promise<Response> => {
  const res = await fetch(url, options);
  if (res.status === 429) {
    if (retryCount >= 5) return res;
    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : (retryCount + 1) * 1500;
    console.warn(`[Klaviyo] 429 — retrying in ${waitMs}ms`);
    await wait(waitMs);
    return apiFetch(url, options, retryCount + 1);
  }
  return res;
};

const buildHeaders = (apiKey: string): HeadersInit => ({
  'Authorization': `Klaviyo-API-Key ${apiKey}`,
  'Revision': REVISION,
  'Accept': 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
});

const apiPost = async (apiKey: string, endpoint: string, body: any): Promise<any> => {
  try {
    const res = await apiFetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify(body),
    });
    if (!res.ok) { console.error(`[Klaviyo] POST ${res.status} on ${endpoint}`); return null; }
    return await res.json();
  } catch (e) { console.error('[Klaviyo] POST Failure:', e); return null; }
};

const apiGet = async (apiKey: string, endpoint: string): Promise<any> => {
  try {
    const res = await apiFetch(`${BASE}/${endpoint}`, { headers: buildHeaders(apiKey) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
};

// ─── Per-account metric ID cache (persists for entire session) ───
const metricIdCache: Record<string, any> = {};

// ─── Build metric-aggregate POST body ───
const buildAggBody = (
  metricId: string,
  since: string,
  until: string,
  measurements: string[],
  by: string[] = []
) => ({
  data: {
    type: 'metric-aggregate',
    attributes: {
      metric_id: metricId,
      measurements,
      ...(by.length > 0 && { by }),
      filter: [
        `greater-or-equal(datetime,${since}T00:00:00Z)`,
        `less-than(datetime,${until}T23:59:59Z)`,
      ],
      interval: 'day',
      timezone: 'UTC',
    },
  },
});

// ─── Parsers ───
const sumMeasure = (res: any, key: 'sum_value' | 'count'): number => {
  const values = res?.data?.attributes?.data?.[0]?.measurements?.[key];
  return Array.isArray(values) ? values.reduce((a: number, b: number) => a + b, 0) : 0;
};

const dailyMeasure = (res: any, key: 'sum_value' | 'count'): { date: string; val: number }[] => {
  const values = res?.data?.attributes?.data?.[0]?.measurements?.[key] || [];
  const dates = res?.data?.attributes?.dates || [];
  return values.map((val: number, i: number) => ({
    val,
    date: dates[i] ? dates[i].split('T')[0] : `Día ${i + 1}`,
  }));
};

const sumAttributed = (res: any): number => {
  if (!res?.data?.attributes?.data) return 0;
  return res.data.attributes.data.reduce((total: number, d: any) => {
    if (!d.dimensions[0]) return total;
    return total + d.measurements.sum_value.reduce((a: number, b: number) => a + b, 0);
  }, 0);
};

const dailyAttributed = (res: any): { date: string; val: number }[] => {
  if (!res?.data?.attributes?.data) return [];
  const dates = res.data.attributes.dates || [];
  const totals = new Array(dates.length).fill(0);
  res.data.attributes.data.forEach((d: any) => {
    if (d.dimensions[0]) d.measurements.sum_value.forEach((v: number, i: number) => { totals[i] += v; });
  });
  return totals.map((val, i) => ({ val, date: dates[i] ? dates[i].split('T')[0] : `Día ${i + 1}` }));
};

export const klaviyo = {
  getMetrics: async (apiKey: string) => {
    if (metricIdCache[apiKey]) return metricIdCache[apiKey];
    const res = await apiGet(apiKey, 'metrics');
    if (res) metricIdCache[apiKey] = res;
    return res;
  },

  getMetricAggregate: async (
    apiKey: string,
    metricId: string,
    since: string,
    until: string,
    measurements: string[] = ['sum_value'],
    by: string[] = []
  ) => apiPost(apiKey, 'metric-aggregates', buildAggBody(metricId, since, until, measurements, by)),

  getDashboardData: async (apiKey: string, since: string, until: string) => {
    // ─── Cache check: skip all API calls if fresh data exists ───
    const cacheKey = `dashboard:${apiKey}:${since}:${until}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[Klaviyo] ✅ Cache hit for', cacheKey);
      return cached;
    }

    try {
      // 1. Get metric IDs (also cached per session)
      const metricsRes = await klaviyo.getMetrics(apiKey);
      if (!metricsRes?.data) return null;

      const metrics = metricsRes.data;

      // Log all available metric names for debugging
      console.log('[Klaviyo] Available metrics:', metrics.map((m: any) => `${m.id}: ${m.attributes.name}`));

      const findId = (names: string[]) => {
        // 1. Exact match (case-insensitive)
        let found = metrics.find((m: any) =>
          names.some((n: string) => m.attributes.name.toLowerCase() === n.toLowerCase())
        );
        // 2. Partial match
        if (!found) {
          found = metrics.find((m: any) =>
            names.some((n: string) => m.attributes.name.toLowerCase().includes(n.toLowerCase()))
          );
        }
        return found?.id;
      };

      const mIds = {
        revenue: findId(['Placed Order', 'Pedido Realizado', 'Order Placed', 'Completed Order']),
        opens:   findId(['Opened Email', 'Email Abierto', 'Email Open', 'Open Email']),
        clicks:  findId(['Clicked Email', 'Email Clicado', 'Email Click', 'Click Email', 'Clicked Link in Email']),
        // "Received Email" is the key one — Klaviyo also calls it "Email Delivered" in some accounts
        sent:    findId(['Received Email', 'Email Recibido', 'Email Delivered', 'Delivered Email', 'Sent Email', 'Email Sent']),
      };

      console.log('[Klaviyo] Resolved metric IDs:', mIds);

      // 2. Fire ALL 5 requests simultaneously
      const [revenueRes, attributedRes, sentRes, opensRes, clicksRes] = await Promise.all([
        mIds.revenue ? apiPost(apiKey, 'metric-aggregates', buildAggBody(mIds.revenue, since, until, ['sum_value', 'count'])) : null,
        mIds.revenue ? apiPost(apiKey, 'metric-aggregates', buildAggBody(mIds.revenue, since, until, ['sum_value'], ['$attributed_message'])) : null,
        mIds.sent    ? apiPost(apiKey, 'metric-aggregates', buildAggBody(mIds.sent,    since, until, ['count'])) : null,
        mIds.opens   ? apiPost(apiKey, 'metric-aggregates', buildAggBody(mIds.opens,   since, until, ['count'])) : null,
        mIds.clicks  ? apiPost(apiKey, 'metric-aggregates', buildAggBody(mIds.clicks,  since, until, ['count'])) : null,
      ]);

      const result = {
        revenue:          sumMeasure(revenueRes, 'sum_value'),
        attributed:       sumAttributed(attributedRes),
        opens:            sumMeasure(opensRes,   'count'),
        clicks:           sumMeasure(clicksRes,  'count'),
        sent:             sumMeasure(sentRes,    'count'),
        conversions:      sumMeasure(revenueRes, 'count'),
        dailyRevenue:     dailyMeasure(revenueRes, 'sum_value'),
        dailyAttributed:  dailyAttributed(attributedRes),
        dailyOpens:       dailyMeasure(opensRes,   'count'),
        dailyClicks:      dailyMeasure(clicksRes,  'count'),
        dailySent:        dailyMeasure(sentRes,    'count'),
        dailyConversions: dailyMeasure(revenueRes, 'count'),
      };

      // Integrity check: if sent=0 but opens or clicks>0, the "sent" metric ID wasn't found.
      // Don't cache bad data — clear the metric ID cache so it re-fetches fresh next time.
      const dataLooksCorrupt = result.sent === 0 && (result.opens > 0 || result.clicks > 0);
      if (dataLooksCorrupt) {
        console.warn('[Klaviyo] ⚠️ Data integrity issue: sent=0 but opens/clicks>0. Metric ID for sent not found. Clearing metric cache.');
        delete metricIdCache[apiKey];
        // Still return the result so the UI shows something, but don't cache it
        return result;
      }

      // Cache the result for 5 minutes only if data looks valid
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[Klaviyo] getDashboardData error:', err);
      return null;
    }
  },

  getFlows: async (apiKey: string) => {
    const cacheKey = `flows:${apiKey}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    try {
      const res = await apiFetch(`${BASE}/flows`, { headers: buildHeaders(apiKey) });
      if (!res.ok) return [];
      const json = await res.json();
      const data = json.data || [];
      setCache(cacheKey, data);
      return data;
    } catch (e) { return []; }
  },

  getCampaigns: async (apiKey: string) => {
    const cacheKey = `campaigns:${apiKey}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    try {
      const res = await apiFetch(`${BASE}/campaigns?filter=equals(messages.channel,'email')`, {
        headers: buildHeaders(apiKey),
      });
      if (!res.ok) return [];
      const json = await res.json();
      const data = json.data || [];
      setCache(cacheKey, data);
      return data;
    } catch (e) { return []; }
  },

  getFlowMessages: async (apiKey: string, flowId: string) => {
    try {
      const actRes = await apiFetch(`${BASE}/flows/${flowId}/flow-actions`, {
        headers: buildHeaders(apiKey),
      });
      if (!actRes.ok) return [];
      const actions = await actRes.json();

      const msgPromises = (actions.data || [])
        .filter((a: any) => a.type === 'flow-action')
        .map((action: any) =>
          apiFetch(`${BASE}/flow-actions/${action.id}/flow-messages`, {
            headers: buildHeaders(apiKey),
          }).then(r => r.ok ? r.json() : { data: [] })
        );

      const results = await Promise.all(msgPromises);
      return results.flatMap(r => r.data || []);
    } catch (e) { return []; }
  },

  getCampaignMessages: async (apiKey: string, campaignId: string) => {
    try {
      const res = await apiFetch(`${BASE}/campaigns/${campaignId}/campaign-messages`, {
        headers: buildHeaders(apiKey),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch (e) { return []; }
  },
};
