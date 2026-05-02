import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set. Database calls will fail at runtime.");
}

const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : () => { throw new Error("DATABASE_URL environment variable is not set."); };

export default sql;
