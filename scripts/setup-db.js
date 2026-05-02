import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function setup() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      phone      TEXT NOT NULL,
      name       TEXT NOT NULL,
      country    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meradoc_patients (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE REFERENCES users(email) ON DELETE CASCADE,
      patient_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE meradoc_patients
    ADD CONSTRAINT IF NOT EXISTS meradoc_patients_email_unique UNIQUE (email)
  `.catch(() => null);

  console.log("Tables created successfully.");
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
