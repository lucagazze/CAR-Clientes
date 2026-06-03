import { db } from '../services/db';

async function run() {
  const userId = '3973abe3-ca7c-4a7c-b51a-f5024731bb6c'; // algoritmiadesarrollos@gmail.com
  const email = 'algoritmiadesarrollos@gmail.com';

  console.log("Calling db.profile.getByUserId...");
  try {
    const profile = await db.profile.getByUserId(userId, email);
    console.log("Result:", profile);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
