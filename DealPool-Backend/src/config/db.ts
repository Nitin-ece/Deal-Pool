// Database configuration — single source of truth for Postgres connection.
// Uses SUPABASE_URI connection string (preferred) with fallback to individual vars.
// Loads .env.test when NODE_ENV=test to isolate test runs from dev/prod data.
import dotenv from "dotenv";
import { Pool } from "pg";

// Load the correct env file based on NODE_ENV
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: envFile });

const connectionString = process.env.SUPABASE_URI;

const pool = connectionString
    ? new Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
      })
    : new Pool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || "postgres",
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: { rejectUnauthorized: false },
      });

export const connectDB = async (): Promise<void> => {
    try {
        const client = await pool.connect();
        client.release();

        console.log("PostgreSQL connected");
    } catch (error) {
        console.error(
            "PostgreSQL connection failed:",
            error
        );

        process.exit(1);
    }
};

export default pool;