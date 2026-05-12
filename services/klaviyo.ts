
const REVISION = '2024-10-15';
const BASE = '/api/klaviyo';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limit: Klaviyo metric-aggregates allows ~15 req/min.
// We use a lighter 1.2s gap — fast enough to show data, safe enough to avoid 429s.
// If we do get a 429 we retry with exponential backoff.
let lastRequestTime = 0;
const MIN_GAP_MS = 1200;

const rateLimitedFetch = async (url: string, options: RequestInit, retryCount = 0): Promise<Response> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_GAP_MS) {
    await wait(MIN_GAP_MS - elapsed);
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, options);

  if (res.status === 429) {
    if (retryCount >= 3) {
      console.error('[Klaviyo] Max retries reached on 429');
      return res;
    }
    const retryAfter = res.headers.get('Retry-After');
    const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, retryCount) * 5;
    console.warn(`[Klaviyo] 429 — waiting ${waitSeconds}s (retry ${retryCount + 1}/3)...`);
    await wait(waitSeconds * 1000);
    return rateLimitedFetch(url, options, retryCount + 1);
  }

  return res;
};

const apiPost = async (apiKey: string, endpoint: string, body: any): Promise<any> => {
  try {
    const res = await rateLimitedFetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Revision': REVISION,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`[Klaviyo] POST Error (${res.status}) on ${endpoint}:`, txt);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('[Klaviyo] POST Failure:', e);
    return null;
  }
};

const apiGet = async (apiKey: string, endpoint: string): Promise<any> => {
  try {
    const res = await rateLimitedFetch(`${BASE}/${endpoint}`, {
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Revision': REVISION,
        'Accept': 'application/vnd.api+json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

// Cache metric IDs per account to avoid refetching
const metricIdCache: Record<string, any> = {};

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
    measurements: string[] = ['sum_value']
  ) => {
    return apiPost(apiKey, 'metric-aggregates', {
      data: {
        type: 'metric-aggregate',
        attributes: {
          metric_id: metricId,
          measurements: measurements,
          filter: [
            `greater-or-equal(datetime,${since}T00:00:00Z)`,
            `less-than(datetime,${until}T23:59:59Z)`
          ],
          interval: 'day',
          timezone: 'UTC'
        }
      }
    });
  },

  getDashboardData: async (apiKey: string, since: string, until: string) => {
    try {
      const metricsRes = await klaviyo.getMetrics(apiKey);
      if (!metricsRes?.data) return null;

      const metrics = metricsRes.data;
      const findId = (names: string[]) => {
        const found = metrics.find((m: any) =>
          names.some(n => m.attributes.name.toLowerCase().includes(n.toLowerCase()))
        );
        return found?.id;
      };

      const mIds = {
        revenue: findId(['Placed Order', 'Ordered Product', 'Order Placed', 'Pedido']),
        opens:   findId(['Opened Email', 'Open Email', 'Email Abierto', 'Apertura']),
        clicks:  findId(['Clicked Email', 'Click Email', 'Email Clicado', 'Clic']),
        sent:    findId(['Received Email', 'Sent Email', 'Receive Email', 'Email Recibido', 'Envío']),
      };

      console.log('[Klaviyo] Metric IDs found:', mIds);

      // measurements is an OBJECT with named keys, e.g. { sum_value: [...daily values] }
      const sumMeasure = (res: any, key: 'sum_value' | 'count'): number => {
        const values = res?.data?.attributes?.data?.[0]?.measurements?.[key];
        if (!Array.isArray(values)) return 0;
        return values.reduce((a: number, b: number) => a + b, 0);
      };

      const dailyMeasure = (res: any, key: 'sum_value' | 'count'): number[] => {
        return res?.data?.attributes?.data?.[0]?.measurements?.[key] || [];
      };

      // Fetch current period metrics sequentially
      const results: any = {};
      if (mIds.revenue) results.revenue = await klaviyo.getMetricAggregate(apiKey, mIds.revenue, since, until, ['sum_value', 'count']);
      if (mIds.sent)    results.sent    = await klaviyo.getMetricAggregate(apiKey, mIds.sent,    since, until, ['count']);
      if (mIds.opens)   results.opens   = await klaviyo.getMetricAggregate(apiKey, mIds.opens,   since, until, ['count']);
      if (mIds.clicks)  results.clicks  = await klaviyo.getMetricAggregate(apiKey, mIds.clicks,  since, until, ['count']);

      const out = {
        revenue:          sumMeasure(results.revenue, 'sum_value'),
        opens:            sumMeasure(results.opens,   'count'),
        clicks:           sumMeasure(results.clicks,  'count'),
        sent:             sumMeasure(results.sent,    'count'),
        // Conversions is the count of revenue events (placed orders)
        conversions:      sumMeasure(results.revenue, 'count'),
        dailyRevenue:     dailyMeasure(results.revenue, 'sum_value'),
        dailyOpens:       dailyMeasure(results.opens,   'count'),
        dailyClicks:      dailyMeasure(results.clicks,  'count'),
        dailySent:        dailyMeasure(results.sent,    'count'),
        dailyConversions: dailyMeasure(results.revenue, 'count'),
      };

      console.log('[Klaviyo] Dashboard data:', out);
      return out;
    } catch (err) {
      console.error('[Klaviyo] getDashboardData error:', err);
      return null;
    }
  }
};
