const BASE = '/api/shopify';

export const ecommerce = {
  getShopifyOrders: async (domain: string, token: string, since: string, until: string) => {
    try {
      // Shopify requires ISO format for dates
      const sinceIso = new Date(`${since}T00:00:00Z`).toISOString();
      const untilIso = new Date(`${until}T23:59:59Z`).toISOString();
      
      let allOrders: any[] = [];
      let nextLink = `orders?status=any&created_at_min=${sinceIso}&created_at_max=${untilIso}&limit=250`;
      
      // Simple pagination (max 3 pages to avoid rate limits / slow loading)
      for (let i = 0; i < 3; i++) {
        if (!nextLink) break;
        
        const res = await fetch(`${BASE}/${nextLink}`, {
          headers: {
            'x-shopify-domain': domain,
            'x-shopify-access-token': token
          }
        });
        
        if (!res.ok) {
          console.error('[Shopify] Error fetching orders', await res.text());
          break;
        }
        
        const data = await res.json();
        if (data.orders) {
          allOrders = [...allOrders, ...data.orders];
        }

        // Shopify pagination uses Link header, simplified here: we just take max 250 for now
        // To implement full cursor pagination we'd need to parse the Link header.
        break; // For MVP, we'll just take the first 250 orders of the period
      }

      return allOrders;
    } catch (e) {
      console.error('[Shopify] Fetch Exception:', e);
      return [];
    }
  },

  getDashboardData: async (platform: string, domain: string, token: string, since: string, until: string) => {
    if (platform !== 'shopify') return null; // Tiendanube soon
    
    const orders = await ecommerce.getShopifyOrders(domain, token, since, until);
    if (!orders) return null;

    // Filter cancelled/voided if needed, but 'status=any' gets all. Let's filter out cancelled.
    const validOrders = orders.filter(o => !o.cancelled_at && o.financial_status !== 'voided');

    const totalRevenue = validOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const ordersCount = validOrders.length;
    const aov = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    // Daily breakdown
    const dailyData: Record<string, { revenue: number; orders: number }> = {};
    
    // Initialize dates
    const start = new Date(`${since}T00:00:00`);
    const end = new Date(`${until}T23:59:59`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyData[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 };
    }

    validOrders.forEach(o => {
      const date = o.created_at.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].revenue += parseFloat(o.total_price || 0);
        dailyData[date].orders += 1;
      }
    });

    return {
      revenue: totalRevenue,
      orders: ordersCount,
      aov: aov,
      daily: Object.keys(dailyData).sort().map(date => ({
        date,
        revenue: dailyData[date].revenue,
        orders: dailyData[date].orders
      }))
    };
  }
};
