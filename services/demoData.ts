// Demo / simulation data layer.
// When the app is using "demo" tokens/ids (created for the demo@car.app user),
// services short-circuit and return realistic-looking fake data instead of
// hitting Shopify / Meta / Klaviyo / Chatwoot.

export const DEMO_SHOPIFY_DOMAIN = 'demo-store.myshopify.com';
export const DEMO_EMAIL = 'demo@car.app';
export const DEMO_PASSWORD = 'DemoCar2026!';
export const DEMO_USER_ID = 'demo-user';
export const DEMO_CLIENT_ID = 'demo-car-client';
export const DEMO_SESSION_KEY = 'car-demo-session';
export const DEMO_META_ACCOUNT = 'act_999000111';
export const DEMO_KLAVIYO_PREFIX = 'pk_demo_fake';
export const DEMO_CHATWOOT_TOKEN = 'demo_chatwoot_fake_token';
export const DEMO_IG_ID = '17841400000000001';
export const DEMO_FB_PAGE_ID = '100000000000000';
export const DEMO_TIENDANUBE_STORE = 'demo_tn_store';

export const isDemoEmail = (email?: string | null) =>
  String(email || '').trim().toLowerCase() === DEMO_EMAIL;
export const isDemoCredentials = (email?: string | null, password?: string | null) =>
  isDemoEmail(email) && String(password || '') === DEMO_PASSWORD;
export const isDemoShopify = (domain?: string | null) =>
  !!domain && (domain.includes('demo-store.myshopify.com') || domain.startsWith('demo-store'));
export const isDemoMeta = (accountId?: string | null) =>
  !!accountId && accountId.replace('act_', '') === '999000111';
export const isDemoKlaviyo = (key?: string | null) =>
  !!key && key.startsWith(DEMO_KLAVIYO_PREFIX);
export const isDemoChatwoot = (token?: string | null) =>
  !!token && token === DEMO_CHATWOOT_TOKEN;
export const isDemoIG = (id?: string | null) => !!id && id === DEMO_IG_ID;
export const isDemoFBPage = (id?: string | null) => !!id && id === DEMO_FB_PAGE_ID;
export const isDemoProfile = (profile?: any | null) =>
  Boolean(profile && (
    profile.plan === 'demo' ||
    isDemoShopify(profile.shopify_domain) ||
    isDemoMeta(profile.meta_account_id) ||
    isDemoKlaviyo(profile.klaviyo_api_key)
  ));

export const withDemoProfileDefaults = <T extends Record<string, any> | null>(
  profile: T,
  email?: string | null,
  userId?: string | null,
): T => {
  if (!profile || (!isDemoEmail(email) && !isDemoProfile(profile))) return profile;
  const now = new Date().toISOString();
  return {
    ...profile,
    id: profile.id || 'demo-car-client',
    user_id: profile.user_id || userId || 'demo-user',
    business_name: 'Demo Store',
    business_logo_url: profile.business_logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed=Demo',
    industry: 'Moda ecommerce',
    plan: 'demo',
    active: true,
    ecommerce_platform: 'shopify',
    shopify_domain: DEMO_SHOPIFY_DOMAIN,
    shopify_access_token: profile.shopify_access_token || 'demo_shopify_token',
    meta_account_id: DEMO_META_ACCOUNT,
    meta_pixel_id: profile.meta_pixel_id || 'demo_pixel_999000111',
    facebook_access_token: profile.facebook_access_token || 'demo_meta_token',
    klaviyo_api_key: `${DEMO_KLAVIYO_PREFIX}_dashboard`,
    klaviyo_list_id: profile.klaviyo_list_id || 'demo_list_001',
    chatwoot_url: profile.chatwoot_url || 'https://demo.chatwoot.local',
    chatwoot_token: DEMO_CHATWOOT_TOKEN,
    fb_page_id: DEMO_FB_PAGE_ID,
    fb_page_name: 'Demo Store Oficial',
    fb_page_access_token: profile.fb_page_access_token || 'demo_page_token',
    ig_business_id: DEMO_IG_ID,
    ig_username: 'demostore',
    website_url: profile.website_url || 'https://demostore.example.com',
    business_description: profile.business_description || 'Tienda demo con datos simulados para presentar C.A.R.',
    client_tags: ['tienda_online', 'meta_ads', 'email_marketing', 'mensajeria', 'demo'],
    connection_statuses: {
      ...(profile.connection_statuses || {}),
      shopify: 'ok',
      ecommerce: 'connected',
      meta: 'ok',
      instagram: 'ok',
      facebook: 'ok',
      klaviyo: 'ok',
      chatwoot: 'ok',
    },
    created_at: profile.created_at || now,
  } as T;
};

export const buildDemoProfile = (email: string = DEMO_EMAIL, userId: string = DEMO_USER_ID) =>
  withDemoProfileDefaults({
    id: DEMO_CLIENT_ID,
    user_id: userId,
    email,
    business_name: 'Demo Store',
    created_at: new Date().toISOString(),
  } as any, email, userId);

export const buildDemoUser = () => ({
  id: DEMO_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: DEMO_EMAIL,
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'demo', providers: ['demo'] },
  user_metadata: { name: 'Demo Store' },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const buildDemoSession = () => {
  const user = buildDemoUser();
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: 'bearer',
    user,
  };
};

const seedFromStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
};

const PRODUCTS = [
  { id: 'p1', title: 'Buzo Oversize Negro',          price: 35900,  variants: ['XS','S','M','L','XL'] },
  { id: 'p2', title: 'Campera Puffer Aurora',        price: 89900,  variants: ['S','M','L','XL'] },
  { id: 'p3', title: 'Pantalón Cargo Stone',         price: 42500,  variants: ['28','30','32','34','36'] },
  { id: 'p4', title: 'Remera Boxy Crema',            price: 18900,  variants: ['XS','S','M','L'] },
  { id: 'p5', title: 'Hoodie Tonal Antracita',       price: 39900,  variants: ['S','M','L','XL'] },
  { id: 'p6', title: 'Riñonera Tech Negra',          price: 24900,  variants: ['Único'] },
  { id: 'p7', title: 'Zapatillas Wave Off-White',    price: 64900,  variants: ['38','39','40','41','42','43'] },
  { id: 'p8', title: 'Camisa Lino Crema',            price: 32900,  variants: ['S','M','L','XL'] },
  { id: 'p9', title: 'Short Performance Black',      price: 19900,  variants: ['S','M','L','XL'] },
  { id: 'p10', title: 'Buzo Crop Lila',              price: 28900,  variants: ['XS','S','M','L'] },
];

const CUSTOMERS = [
  ['Camila','Rossi','camila.rossi@gmail.com','+541138472901'],
  ['Joaquín','Pereyra','joaquin.pereyra@gmail.com','+541166210034'],
  ['Martina','Gómez','martina.gomez@gmail.com','+541159381122'],
  ['Lucas','Fernández','lucas.f@gmail.com','+541140290011'],
  ['Sofía','Acuña','sofia.acuna@gmail.com','+541139023488'],
  ['Bruno','Caballero','bruno.cab@gmail.com','+541171922043'],
  ['Valentina','López','vale.lopez@gmail.com','+541133048711'],
  ['Mateo','Suárez','mateo.suarez@gmail.com','+541166203411'],
  ['Renata','Martínez','rena.martinez@gmail.com','+541140221033'],
  ['Iván','Domínguez','ivan.dom@gmail.com','+541129380122'],
];

const CITIES = [
  ['CABA','Argentina','C1414'],['Vicente López','Argentina','B1638'],
  ['La Plata','Argentina','B1900'],['Rosario','Argentina','S2000'],
  ['Mar del Plata','Argentina','B7600'],['Córdoba','Argentina','X5000'],
];

const argDateStr = (d: Date) => {
  const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return ar.toISOString().slice(0, 10);
};

function daysBetween(since: string, until: string): string[] {
  const out: string[] = [];
  const s = new Date(`${since}T00:00:00-03:00`).getTime();
  const e = new Date(`${until}T23:59:59-03:00`).getTime();
  let cur = s;
  let n = 0;
  while (cur <= e && n++ < 400) {
    out.push(argDateStr(new Date(cur)));
    cur += 24 * 3600 * 1000;
  }
  return out;
}

export function buildDemoOrders(since: string, until: string) {
  const days = daysBetween(since, until);
  const r = rand(seedFromStr(`orders:${since}:${until}`));
  const orders: any[] = [];
  let nextId = 5_400_000;
  let orderNum = 4200;
  for (const day of days) {
    const ordersToday = 4 + Math.floor(r() * 12);
    for (let i = 0; i < ordersToday; i++) {
      const product = PRODUCTS[Math.floor(r() * PRODUCTS.length)];
      const qty = 1 + Math.floor(r() * 2);
      const variant = product.variants[Math.floor(r() * product.variants.length)];
      const cust = CUSTOMERS[Math.floor(r() * CUSTOMERS.length)];
      const city = CITIES[Math.floor(r() * CITIES.length)];
      const subtotal = product.price * qty;
      const discount = r() < 0.3 ? Math.round(subtotal * 0.1) : 0;
      const ship = r() < 0.6 ? 0 : 2500;
      const tax = 0;
      const total = subtotal - discount + ship + tax;
      const ts = new Date(`${day}T${10 + Math.floor(r() * 11)}:${Math.floor(r() * 60).toString().padStart(2,'0')}:00-03:00`).toISOString();
      const isReturning = r() < 0.35;
      orders.push({
        id: ++nextId,
        order_number: ++orderNum,
        name: `#${orderNum}`,
        created_at: ts,
        total_price: total,
        subtotal_price: subtotal,
        total_tax: tax,
        total_discounts: discount,
        financial_status: 'paid',
        fulfillment_status: r() < 0.78 ? 'fulfilled' : null,
        cancelled_at: null,
        email: cust[2],
        phone: cust[3],
        customer: {
          id: 1000 + Math.floor(r() * 9000),
          first_name: cust[0], last_name: cust[1],
          email: cust[2], phone: cust[3],
          orders_count: isReturning ? 2 + Math.floor(r() * 4) : 1,
          total_spent: total + (isReturning ? Math.floor(r() * 60000) : 0),
        },
        line_items: [{
          id: 10000 + Math.floor(r() * 90000),
          product_id: product.id, variant_id: `${product.id}_${variant}`,
          title: product.title, quantity: qty, price: product.price,
          variant_title: variant,
        }],
        shipping_address: { name: `${cust[0]} ${cust[1]}`, address1: 'Av. Demo 1234', city: city[0], province: 'Buenos Aires', country: city[1], zip: city[2], phone: cust[3] },
        billing_address: { name: `${cust[0]} ${cust[1]}`, address1: 'Av. Demo 1234', city: city[0], country: city[1], zip: city[2] },
        discount_codes: discount > 0 ? [{ code: 'DROP10', amount: discount }] : [],
        shipping_lines: ship > 0 ? [{ title: 'OCA estándar', price: ship }] : [{ title: 'Envío gratis', price: 0 }],
      });
    }
  }
  return orders;
}

export function buildDemoDashboardData(since: string, until: string) {
  const orders = buildDemoOrders(since, until);
  const totalRevenue = orders.reduce((s, o) => s + o.total_price, 0);
  const ordersCount = orders.length;
  const aov = ordersCount > 0 ? totalRevenue / ordersCount : 0;
  const totalDiscounts = orders.reduce((s, o) => s + o.total_discounts, 0);

  const daily: Record<string, { revenue: number; orders: number }> = {};
  for (const d of daysBetween(since, until)) daily[d] = { revenue: 0, orders: 0 };
  for (const o of orders) {
    const d = argDateStr(new Date(o.created_at));
    if (daily[d]) { daily[d].revenue += o.total_price; daily[d].orders += 1; }
  }

  let returning = 0, fresh = 0, fulfilled = 0, unfulfilled = 0;
  const productStats: Record<string, { title: string; quantity: number; revenue: number }> = {};
  for (const o of orders) {
    if (o.customer?.orders_count > 1) returning++; else fresh++;
    if (o.fulfillment_status === 'fulfilled') fulfilled++; else unfulfilled++;
    for (const it of o.line_items) {
      const k = it.product_id;
      if (!productStats[k]) productStats[k] = { title: it.title, quantity: 0, revenue: 0 };
      productStats[k].quantity += it.quantity;
      productStats[k].revenue += it.price * it.quantity;
    }
  }
  const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 7);
  const BASE_CONV = 2.56;
  const totalSessions = ordersCount > 0 ? Math.round(ordersCount / (BASE_CONV / 100)) : 0;
  const conversionRate = totalSessions > 0 ? +((ordersCount / totalSessions) * 100).toFixed(2) : 0;

  const dailyArr = Object.keys(daily).sort().map(date => {
    const dOrders = daily[date].orders;
    const dSessions = dOrders > 0 ? Math.round(dOrders / (BASE_CONV / 100)) : 0;
    return {
      date, revenue: daily[date].revenue, orders: dOrders, sessions: dSessions,
      conversionRate: dSessions > 0 ? +((dOrders / dSessions) * 100).toFixed(2) : 0,
      aov: dOrders > 0 ? daily[date].revenue / dOrders : 0,
    };
  });

  const recentOrders = orders.slice(-20).reverse().map(o => ({
    id: o.id, order_number: o.order_number, created_at: o.created_at,
    total_price: o.total_price, financial_status: o.financial_status,
    fulfillment_status: o.fulfillment_status || 'unfulfilled',
    customer_name: `${o.customer.first_name} ${o.customer.last_name}`,
    line_items_count: o.line_items.reduce((s: number, i: any) => s + i.quantity, 0),
    line_items: o.line_items, shipping_address: o.shipping_address,
    billing_address: o.billing_address, customer: o.customer,
    email: o.email, phone: o.phone, subtotal_price: o.subtotal_price,
    total_tax: o.total_tax, total_discounts: o.total_discounts,
    discount_codes: o.discount_codes, shipping_lines: o.shipping_lines,
  }));

  return {
    revenue: totalRevenue, orders: ordersCount, aov,
    sessions: totalSessions, conversionRate, totalDiscounts,
    customerSplit: { returning, new: fresh, returningRate: ordersCount > 0 ? (returning / ordersCount) * 100 : 0 },
    fulfillmentSplit: { fulfilled, unfulfilled },
    topProducts, daily: dailyArr, recentOrders,
  };
}

export function buildDemoProducts() {
  return PRODUCTS.map((p, i) => ({
    id: p.id,
    title: p.title,
    handle: p.title.toLowerCase().replace(/\s+/g, '-'),
    status: 'active',
    vendor: 'Demo Store',
    product_type: i % 2 === 0 ? 'Apparel' : 'Accessories',
    created_at: new Date(Date.now() - (90 + i*7) * 86400000).toISOString(),
    image: { src: `https://picsum.photos/seed/${p.id}/600/600` },
    images: [{ src: `https://picsum.photos/seed/${p.id}/600/600` }],
    variants: p.variants.map((v, k) => ({
      id: `${p.id}_${v}`, product_id: p.id, title: v, sku: `${p.id.toUpperCase()}-${v}`,
      price: String(p.price), compare_at_price: null,
      inventory_quantity: 5 + Math.floor((i + k) * 3.7) % 40,
      option1: v, weight: 0.5, requires_shipping: true,
    })),
    options: [{ name: 'Talle', values: p.variants }],
    tags: ['demo', i % 2 === 0 ? 'drop-invierno' : 'permanente'].join(', '),
  }));
}

export function buildDemoMetaInsightsDaily(since: string, until: string) {
  const days = daysBetween(since, until);
  const r = rand(seedFromStr(`meta:${since}:${until}`));
  return days.map(date => {
    const spend = 4500 + Math.floor(r() * 5500);
    const impressions = 28000 + Math.floor(r() * 22000);
    const reach = Math.floor(impressions * (0.55 + r() * 0.2));
    const clicks = Math.floor(impressions * (0.012 + r() * 0.016));
    const purchases = Math.floor(clicks * (0.04 + r() * 0.04));
    const rev = purchases * (32000 + Math.floor(r() * 16000));
    return {
      date_start: date, date_stop: date,
      spend: String(spend), impressions: String(impressions), reach: String(reach),
      clicks: String(clicks),
      cpm: String((spend / impressions * 1000).toFixed(2)),
      ctr: String((clicks / impressions * 100).toFixed(2)),
      frequency: String((impressions / Math.max(reach, 1)).toFixed(2)),
      actions: [
        { action_type: 'purchase', value: String(purchases) },
        { action_type: 'add_to_cart', value: String(purchases * 4) },
        { action_type: 'view_content', value: String(purchases * 12) },
      ],
      action_values: [
        { action_type: 'purchase', value: String(rev) },
      ],
      purchase_roas: [{ action_type: 'omni_purchase', value: String((rev / spend).toFixed(2)) }],
    };
  });
}

export function buildDemoMetaCampaigns() {
  return [
    { id: 'c_aw', name: 'AW | Drop Invierno', status: 'ACTIVE', objective: 'OUTCOME_AWARENESS', daily_budget: '5000' },
    { id: 'c_co', name: 'CO | Catálogo Productos', status: 'ACTIVE', objective: 'OUTCOME_TRAFFIC', daily_budget: '4000' },
    { id: 'c_cv', name: 'CV | Retargeting Carrito', status: 'ACTIVE', objective: 'OUTCOME_SALES', daily_budget: '8000' },
    { id: 'c_cv2', name: 'CV | Lookalike 1%', status: 'ACTIVE', objective: 'OUTCOME_SALES', daily_budget: '6000' },
  ];
}

export function buildDemoMetaAds() {
  return [
    { id: 'ad_1', name: 'UGC | Buzo Oversize', status: 'ACTIVE', adset_id: 'as_1', creative: { thumbnail_url: 'https://picsum.photos/seed/ad1/400/400' } },
    { id: 'ad_2', name: 'Demo | Cómo combinarlo', status: 'ACTIVE', adset_id: 'as_2', creative: { thumbnail_url: 'https://picsum.photos/seed/ad2/400/400' } },
    { id: 'ad_3', name: 'Testimonial | Camila R', status: 'ACTIVE', adset_id: 'as_3', creative: { thumbnail_url: 'https://picsum.photos/seed/ad3/400/400' } },
    { id: 'ad_4', name: 'Offer | Cuotas sin interés', status: 'ACTIVE', adset_id: 'as_4', creative: { thumbnail_url: 'https://picsum.photos/seed/ad4/400/400' } },
    { id: 'ad_5', name: 'Catálogo dinámico', status: 'ACTIVE', adset_id: 'as_5', creative: { thumbnail_url: 'https://picsum.photos/seed/ad5/400/400' } },
  ];
}

export function buildDemoKlaviyoSummary() {
  return {
    profile: { name: 'Demo Store', email: 'demo@car.app' },
    metrics: {
      list_size: 28450,
      active_profiles: 24210,
      growth_30d: 0.041,
    },
    flows: [
      { name: 'Welcome Series', status: 'live', revenue_30d: 1842000 },
      { name: 'Abandoned Cart',  status: 'live', revenue_30d: 2540000 },
      { name: 'Post-Purchase',   status: 'live', revenue_30d: 612000 },
      { name: 'Browse Abandonment', status: 'live', revenue_30d: 388000 },
    ],
    campaigns: [
      { name: 'Drop Invierno — Lanzamiento', sent_at: '5 días atrás', open_rate: 0.38, click_rate: 0.061, revenue: 4_320_000 },
      { name: 'Newsletter Semanal #24',      sent_at: '10 días atrás', open_rate: 0.31, click_rate: 0.042, revenue: 2_180_000 },
      { name: 'Re-engagement 90 días',       sent_at: '17 días atrás', open_rate: 0.18, click_rate: 0.022, revenue: 412_000 },
    ],
  };
}

export function buildDemoInstagramMedia() {
  const now = Date.now();
  return Array.from({ length: 12 }).map((_, i) => ({
    id: `ig_${17800000 + i}`,
    media_type: i % 3 === 0 ? 'VIDEO' : 'IMAGE',
    media_url: `https://picsum.photos/seed/igm${i}/600/600`,
    thumbnail_url: `https://picsum.photos/seed/igm${i}/300/300`,
    permalink: `https://instagram.com/demostore`,
    caption: `Drop Invierno #${i + 1} — combinalo con la riñonera tech. Link en bio.`,
    timestamp: new Date(now - i * 3 * 86400000).toISOString(),
    like_count: 320 + Math.floor((i * 73) % 1200),
    comments_count: 12 + Math.floor((i * 7) % 60),
  }));
}

export function buildDemoComments(mediaId: string) {
  const seed = seedFromStr(`cm:${mediaId}`);
  const r = rand(seed);
  const samples = [
    '¿Tienen este buzo en S?',
    'Lo amo, ya lo encargué 🙌',
    'Cuánto sale el envío a Córdoba?',
    'Hace cuánto envían?',
    'Re lindo, esperaba este drop',
    '¿Acepta cuotas sin interés?',
    'Hay talle XXL?',
    'El de la foto es lila o gris?',
  ];
  return Array.from({ length: 6 + Math.floor(r() * 6) }).map((_, i) => {
    const cust = CUSTOMERS[Math.floor(r() * CUSTOMERS.length)];
    return {
      id: `c_${mediaId}_${i}`,
      text: samples[Math.floor(r() * samples.length)],
      username: cust[0].toLowerCase() + '.' + cust[1].toLowerCase(),
      timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      replies: { data: [] },
    };
  });
}
