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
      content TEXT