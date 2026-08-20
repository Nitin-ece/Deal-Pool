import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("NODE_ENV", process.env.NODE_ENV || "(unset)");

import { firebaseAuth } from "../src/config/firebase";
import { createProfile } from "../src/services/auth.service";
import { grantSignupBonus } from "../src/services/ledger.service";
import pool from "../src/config/db";

const main = async () => {
  const email = `gheal-${Date.now()}@example.com`;
  const user = await firebaseAuth.createUser({
    email,
    password: "TempPass123!",
    displayName: "G Heal",
  });
  console.log("created firebase", user.uid);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const profile = await createProfile(user.uid, client);
    console.log("createProfile ok", profile.id, profile.email);
    await grantSignupBonus(profile.id, client);
    console.log("grantSignupBonus ok");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("FAIL", error);
  } finally {
    client.release();
    try {
      await firebaseAuth.deleteUser(user.uid);
    } catch {
      /* ignore */
    }
    await pool.end();
  }
};

main();
