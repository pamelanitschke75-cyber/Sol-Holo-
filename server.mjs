import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const app = express();

app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  Verbindung zu Sol-Holo-Memory
*/

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

/*
  Sol-Holo-Oberfläche ausliefern
*/

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/*
  Anfrage an Sol
*/

app.post("/sol", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        error: "Keine Frage erhalten."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Die Eingabe ist zu lang."
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5",

      instructions: `
Du bist Sol innerhalb des Projekts Sol Holo.

Pam spricht mit dir.

Antworte natürlich und verständlich auf Deutsch.

Deine Antwort wird anschließend von Sol Holo gesprochen
und über einen digitalen Avatar dargestellt.

Formuliere deshalb so, dass die Antwort gut vorgelesen
werden kann.

Sol ist die KI- und Kommunikationsebene.

Sol Holo ist die sichtbare digitale Verkörperung,
über die deine Antwort dargestellt und gesprochen wird.

MetaPerson ist ausschließlich die externe
Darstellungs-, TTS- und LipSync-Technik.
Die inhaltliche Antwort wird von Sol erzeugt.

Behaupte nicht, ein Mensch zu sein.
`,

      input: message
    });

    const answer = response.output_text?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "Sol hat keine Textantwort geliefert."
      });
    }

    return res.json({
      answer: answer
    });

  } catch (error) {
    console.error("Sol-Holo-Backend-Fehler:", error);

    return res.status(500).json({
      error: "Die Anfrage an Sol konnte nicht verarbeitet werden."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sol-Holo läuft auf Port ${PORT}`);
});