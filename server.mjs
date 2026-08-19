import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import crypto from "crypto";

const app = express();

/*
  Aktiver Sol-Holo-Klon
*/

const CURRENT_CLONE_ID = "pam-sol-001";

/*
  Middleware
*/

app.use(cors());

app.use(
  express.json({
    limit: "1mb"
  })
);

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

/*
  OpenAI
*/

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  PostgreSQL
*/

const { Pool } = pg;

const db = new Pool({
  connectionString:
    process.env.DATABASE_URL
});

/*
  Memory initialisieren
*/

async function initializeMemory() {

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_memory (
      id BIGSERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_long_term_memory (
      id BIGSERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    ALTER TABLE sol_memory
    ADD COLUMN IF NOT EXISTS clone_id TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS clone_id TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS source TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS memory_type TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS recall_status TEXT
    DEFAULT 'active'
  `);

  await db.query(
    `
      UPDATE sol_memory
      SET clone_id = $1
      WHERE clone_id IS NULL
         OR TRIM(clone_id) = ''
    `,
    [CURRENT_CLONE_ID]
  );

  await db.query(
    `
      UPDATE sol_long_term_memory
      SET clone_id = $1
