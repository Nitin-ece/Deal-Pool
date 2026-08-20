import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import pool from "../src/config/db";

const main = async () => {
  const key = process.env.FIREBASE_API_KEY || "";
  console.log("runtime API key len", key.length, "startsQuote", key.startsWith('"'), "prefix", key.slice(0, 8));

  const cols = await pool.query(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position
  `);
  console.log("columns", cols.rows);

  const cons = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
  `);
  console.log("constraints", cons.rows);

  await pool.end();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
