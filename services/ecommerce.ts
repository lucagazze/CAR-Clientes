const BASE = '/api/shopify';

export const ecommerce = {
  getShopifyOrders: async (domain: string, token: string, since: string, until: string) => {
    try {
      const sinceIso = new Date(`${since}T00:00:00Z`).toISOString();
      const untilIso = new Date(`${until}T23:59:59Z`).toISOString();

      // Clean domain (strip protocol and trailing slash)
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

      // Encode domain in URL path so the Vite proxy router can extract it reliably
      // URL: /api/shopify/<domain>/orders.json?...
      // Proxy rewrites to: https://<domain>/admin/api/2024-01/orders.json?...
      const url = `${BASE}/${cleanDomain}/orders.json?status=any&created_at_min=${sinceIso}&created_at_max=${untilIso}&limit=250`;

      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': token,
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Shopify] Error fetching orders', res.status, errorText);
        throw new Error(`Shopify API Error: ${res.status}`);
      }

      const data = await res.json();
      console.log(`[Shopify] Fetched ${data.orders?.length ?? 0} orders from ${cleanDomain}`);
      return data.orders ?? [];
    } catch (e) {
      console.error('[Shopify] Fetch Exception:', e);
      throw e;
    }
  },

  getDashboardData: async (platform: string, domain: string, token: string, since: string, until: string) => {
    if (platform !== 'shopify') return null;

    const orders = await ecommerce.getShopifyOrders(domain, token, since, until);
    if (!orders) return null;

    const validOrders = orders.filter((o: any) => !o.cancelled_at && o.financial_status !== 'voided');

    const totalRevenue = validOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price || 0), 0);
    const ordersCount = validOrders.length;
    const aov = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    const dailyData: Record<string, { revenue: number; orders: number }> = {};
    const start = new Date(`${since}T00:00:00`);
    const end = new Date(`${until}T23:59:59`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyData[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 };
    }

    validOrders.forEach((o: any) => {
      const date = o.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].revenue += parseFloat(o.total_price || 0);
        dailyData[date].orders += 1;
      }
    });

    return {
      revenue: totalRevenue,
      orders: ordersCount,
      aov,
      daily: Object.keys(dailyData).sort().map(date => ({
        date,
        revenue: dailyData[date].revenue,
        orders: dailyData[date].orders
      }))
    };
  }
};
