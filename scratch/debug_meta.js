const token = "EAARvpoGdZCfIBQ1GtbvJqwE1ERnlIEZBGVGc8T3SeTKeMOuWZBZAwEoNe73uZBoVSUYnSObcpXklqHtjPr6goHwtmFZCvBBDabW0fkk5Ei2ZCFedAYhtYU4jVAqfOzR0vbWiYPRf9NDI0hP4FVxHsYaMFSGDZBmOjfQ5wvvQUMue9wTtiIB4ZCv10kEEPPivJZBTYcaAZDZD";
const adAccount = "act_2136106490563351";

async function run() {
  console.log("Testing Meta Ads Token...");
  try {
    const url = `https://graph.facebook.com/v21.0/${adAccount}?fields=name,currency,account_status&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

run();
