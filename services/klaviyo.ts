
const REVISION = '2024-10-15';
const BASE = '/api/klaviyo';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Global request queue to serialize ALL Klaviyo calls
// Klaviyo metric-aggregates: XS = 1/s burst, 15/m steady
// We space requests at least 4.5 seconds apart to stay safely under 15/min
let lastRequestTime = 0;
const MIN_GAP_MS = 4100; // 15 req/min = 1 req every 4s. 4.1s is safe.

const rateLimitedFetch = async (url: string, options: RequestInit, retryCount = 0): Promise<Response> => {
  // Enforce minimum gap between requests + jitter to avoid tab synchronization
  const jitter = Math.random() * 1000;
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_GAP_MS) {
    const waitTime = (MIN_GAP_MS - elapsed) + jitter;
    await wait(waitTime);
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, options);

  if (res.status === 429) {
    if (retryCount >= 3) {
      console.error('[Klaviyo] Max retries reached on 429');
      return res;
    }
    // Read Retry-After header
    const retryAfter = res.headers.get('Retry-After');
    const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, retryCount) * 5;
    console.warn(`[Klaviyo] 429 Too Many Requests. Waiting ${waitSeconds}s (Retry ${retryCount + 1}/3)...`);
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
let metricIdCache: Record<string, any> = {};

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
    measurement: 'sum_value' | 'count' | 'unique' = 'sum_value'
  ) => {
    return apiPost(apiKey, 'metric-aggregates', {
      data: {
        type: 'metric-aggregate',
        attributes: {
          metric_id: metricId,
          measurements: [measurement],
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

      // Find metric IDs
      const mIds = {
        // Revenue: "Placed Order" value
        revenue: findId(['Placed Order', 'Ordered Product', 'Order Placed', 'Pedido']),
        // Opens: Opened Email
        opens: findId(['Opened Email', 'Open Email', 'Email Abierto', 'Apertura']),
        // Clicks: Clicked Email
        clicks: findId(['Clicked Email', 'Click Email', 'Email Clicado', 'Clic']),
        // Sent: Received Email (emails sent to recipients)
        sent: findId(['Received Email', 'Sent Email', 'Receive Email', 'Email Recibido', 'Envío']),
      };

      console.log('[Klaviyo] Metric IDs found:', mIds);

      const sum = (res: any): number =>
        res?.data?.attributes?.data?.[0]?.measurements?.[0]?.reduce(
          (a: number, b: number) => a + b, 0
        ) || 0;

      const daily = (res: any): number[] =>
        res?.data?.attributes?.data?.[0]?.measurements?.[0] || [];

      const results: any = {};

      // Fetch sequentially — one request every ~4.5s to stay under 15/min
      if (mIds.revenue) {
        results.revenue = await klaviyo.getMetricAggregate(apiKey, mIds.revenue, since, until, 'sum_value');
      }
      if (mIds.sent) {
        results.sent = await klaviyo.getMetricAggregate(apiKey, mIds.sent, since, until, 'count');
      }
      if (mIds.opens) {
        results.opens = await klaviyo.getMetricAggregate(apiKey, mIds.opens, since, until, 'count');
      }
      if (mIds.clicks) {
        results.clicks = await klaviyo.getMetricAggregate(apiKey, mIds.clicks, since, until, 'count');
      }

      return {
        revenue: sum(results.revenue),
        opens: sum(results.opens),
        clicks: sum(results.clicks),
        sent: sum(results.sent),
        conversions: sum(results.revenue), // conversions = placed orders count
        dailyRevenue: daily(results.revenue),
        dailyOpens: daily(results.opens),
        dailyClicks: daily(results.clicks),
        dailySent: daily(results.sent),
        dailyConversions: daily(results.revenue),
      };
    } catch (err) {
      console.error('[Klaviyo] getDashboardData error:', err);
      return null;
    }
  }
};
