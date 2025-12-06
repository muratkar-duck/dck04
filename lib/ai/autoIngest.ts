import OpenAI from "openai";

export type AutoIngestCharacter = {
  name: string;
  role: string | null;
  genders: string[];
  races: string[];
  startAge: number | null;
  endAge: number | null;
  anyAge: boolean;
  description: string | null;
};

export type AutoIngestResult = {
  logline: string;
  synopsis: string;
  genres: string[];
  eras: string[];
  locations: string[];
  contentWarnings: string[];
  format: string | null;
  estimatedPageCount: number | null;
  characters: AutoIngestCharacter[];
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  rawResponse: unknown;
};

let openai: OpenAI | null = null;

/**
 * Ensure we have an API key; otherwise fail fast with a clear error.
 */
function ensureApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please define it in your environment variables."
    );
  }
}

function getOpenAIClient(): OpenAI {
  ensureApiKey();
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

/**
 * Normalize arrays of strings (trim, dedupe).
 */
function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set<string>();

  for (const v of values) {
    if (typeof v === "string") {
      const cleaned = v.trim();
      if (cleaned) {
        set.add(cleaned);
      }
    }
  }

  return Array.from(set);
}

/**
 * Safely parse JSON out of an LLM response that may contain extra text or code fences.
 */
function safeParseJson(content: string): any {
  const trimmed = content.trim();

  // If it already looks like raw JSON, try directly.
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  // If wrapped in ```json ... ```, extract inner JSON.
  const fenceMatch = trimmed.match(/```json([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return JSON.parse(fenceMatch[1].trim());
  }

  // Fallback: slice between first "{" and last "}".
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = trimmed.slice(firstBrace, lastBrace + 1);
    return JSON.parse(slice);
  }

  // Last resort: attempt to parse the whole thing.
  return JSON.parse(trimmed);
}

export async function runAutoIngestLLM(
  scriptText: string
): Promise<AutoIngestResult> {
  const model =
    process.env.OPENAI_AUTO_INGEST_MODEL?.trim() || "gpt-4o-mini";

  // Truncate extremely long scripts to avoid excessive tokens.
  const MAX_CHARS = 40_000;
  const truncatedScript =
    scriptText.length > MAX_CHARS
      ? scriptText.slice(0, MAX_CHARS) + "\n\n[TRUNCATED]"
      : scriptText;

  const systemPrompt = `
You are an expert script analyst working for Ducktylo, a platform that connects screenwriters (writers) and producers.
Your job is to read a screenplay and produce structured metadata that fits Ducktylo's database schema.

Always respond with STRICT JSON. Do NOT include explanations, markdown, or any text outside the JSON object.
`.trim();

  const userPrompt = `
Read the following screenplay text and extract the requested structured data.

Return a single JSON object with the following shape:

{
  "logline": string,                     // 1–3 sentences, high-level hook of the story
  "synopsis": string,                    // 3–10 paragraphs, detailed but concise story summary
  "genres": string[],                    // high-level genre tags, e.g. ["DRAMA","COMEDY","THRILLER"]
  "eras": string[],                      // e.g. ["CONTEMPORARY","1980S","HISTORICAL"]
  "locations": string[],                 // e.g. ["ISTANBUL","NEW YORK","SPACE STATION"]
  "content_warnings": string[],          // e.g. ["VIOLENCE","STRONG_LANGUAGE","SEXUAL_CONTENT"]
  "format": string | null,               // e.g. "FEATURE_FILM", "TV_SERIES", "SHORT_FILM"
  "estimated_page_count": number | null, // approximate script length in pages
  "characters": [
    {
      "name": string,
      "role": string | null,             // e.g. "lead","support","antagonist"
      "genders": string[],               // e.g. ["male"], ["female"], ["non-binary"]
      "races": string[],                 // optional free-form labels
      "start_age": number | null,
      "end_age": number | null,
      "any_age": boolean,                // true if age is flexible or not specified
      "description": string | null       // short description of the character
    }
  ]
}

Rules:
- Use arrays even if there is only one value (for genres, eras, locations, content_warnings, genders, races).
- Prefer short, code-like values (e.g. "DRAMA" instead of "dramatic movie").
- Avoid spoilers that completely ruin major twists, but be honest and clear.
- If some data is not inferable, set it to null (for scalars) or [] (for arrays).

SCREENPLAY TEXT (TRUNCATED IF TOO LONG):
----------------------------------------
${truncatedScript}
`.trim();

  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const message = completion.choices[0]?.message;
  const content = message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or non-string content.");
  }

  let parsed: any;
  try {
    parsed = safeParseJson(content);
  } catch (err) {
    console.error("Failed to parse LLM JSON response:", err, content);
    throw new Error("Failed to parse JSON from Auto-Ingest LLM response.");
  }

  const logline = typeof parsed.logline === "string" ? parsed.logline.trim() : "";
  const synopsis =
    typeof parsed.synopsis === "string" ? parsed.synopsis.trim() : "";

  const genres = normalizeStringArray(parsed.genres);
  const eras = normalizeStringArray(parsed.eras);
  const locations = normalizeStringArray(parsed.locations);
  const contentWarnings = normalizeStringArray(
    parsed.content_warnings ?? parsed.contentWarnings
  );

  const format =
    typeof parsed.format === "string" && parsed.format.trim()
      ? parsed.format.trim()
      : null;

  const estimatedPageCount =
    typeof parsed.estimated_page_count === "number"
      ? parsed.estimated_page_count
      : typeof parsed.estimatedPageCount === "number"
      ? parsed.estimatedPageCount
      : null;

  const charactersRaw = Array.isArray(parsed.characters)
    ? parsed.characters
    : [];

  const characters: AutoIngestCharacter[] = charactersRaw.map(
    (ch: any): AutoIngestCharacter => ({
      name: typeof ch.name === "string" ? ch.name.trim() : "Unknown",
      role:
        typeof ch.role === "string" && ch.role.trim()
          ? ch.role.trim()
          : null,
      genders: normalizeStringArray(ch.genders),
      races: normalizeStringArray(ch.races),
      startAge:
        typeof ch.start_age === "number"
          ? ch.start_age
          : typeof ch.startAge === "number"
          ? ch.startAge
          : null,
      endAge:
        typeof ch.end_age === "number"
          ? ch.end_age
          : typeof ch.endAge === "number"
          ? ch.endAge
          : null,
      anyAge: Boolean(ch.any_age ?? ch.anyAge ?? false),
      description:
        typeof ch.description === "string" && ch.description.trim()
          ? ch.description.trim()
          : null,
    })
  );

  const usage = completion.usage;

  return {
    logline,
    synopsis,
    genres,
    eras,
    locations,
    contentWarnings,
    format,
    estimatedPageCount,
    characters,
    model,
    promptTokens: usage?.prompt_tokens ?? null,
    completionTokens: usage?.completion_tokens ?? null,
    rawResponse: completion,
  };
}
