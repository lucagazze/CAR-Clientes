const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const wordpressUrl = "https://materiaprimatelas.com.ar";
const wooConsumerKey = "ck_a4e21a221f75d506d36d2c49fa5853b0f5ef8cd4";
const wooConsumerSecret = "cs_8f7bfa6d9dbf1f31f90df21d5a7114da7db01614";

async function main() {
  const base = wordpressUrl.replace(/\/$/, '');
  const creds = Buffer.from(`${wooConsumerKey}:${wooConsumerSecret}`).toString('base64');
  const headers = { Authorization: `Basic ${creds}` };

  console.log("Fetching orders from WooCommerce...");
  const res = await fetch(`${base}/wp-json/wc/v3/orders?per_page=40`, { headers });
  if (!res.ok) {
    console.error("Failed to fetch WooCommerce orders:", res.status, await res.text());
    return;
  }
  const orders = await res.json();
  console.log(`Successfully fetched ${orders.length} orders.`);
  
  if (orders.length > 0) {
    const o = orders[0];
    console.log("Sample Order billing email:", o.billing?.email);
    console.log("Sample Order dates:", {
      date_created: o.date_created,
      date_created_gmt: o.date_created_gmt,
      date_modified: o.date_modified,
      date_modified_gmt: o.date_modified_gmt
    });
    console.log("Sample Order status:", o.status);
    
    // Print summary of all order emails and dates
    console.log("\nSummary of all orders:");
    orders.forEach((o, index) => {
      console.log(`[Order #${o.number}] date_created_gmt: ${o.date_created_gmt}, billing email: ${o.billing?.email}, status: ${o.status}`);
    });
  }
}

main().catch(console.error);
