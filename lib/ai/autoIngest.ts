import OpenAI from "openai";
import {
  CONTENT_ADVISORY_TOPICS,
  ERA_GROUPS,
  GENRE_GROUPS,
  LOCATION_GROUPS,
} from "@/lib/scriptClassificationData";

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

const GENRE_SET = new Set(GENRE_GROUPS.flatMap((group) => group.options.map((option) => option.value)));
const ERA_SET = new Set(ERA_GROUPS.flatMap((group) => group.options.map((option) => option.value)));
const LOCATION_SET = new Set(
  LOCATION_GROUPS.flatMap((group) => group.options.map((option) => option.value))
);
const CONTENT_WARNING_SET = new Set(CONTENT_ADVISORY_TOPICS.map((topic) => topic.value));

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function sanitizeJsonText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/```$/, "");
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function normalizeStringArray(values: unknown, allowed?: Set<string>): string[] {
  if (!Array.isArray(values)) return [];
  const result: string[] = [];
  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const upper = trimmed.toUpperCase();
    if (!allowed || allowed.has(upper)) {
      result.push(upper);
    }
  });
  return Array.from(new Set(result));
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeCharacters(raw: unknown): AutoIngestCharacter[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      return {
        name: typeof obj.name === "string" ? obj.name.trim() : "",
        role: typeof obj.role === "string" && obj.role.trim() ? obj.role.trim() : null,
        genders: normalizeStringArray(obj.genders),
        races: normalizeStringArray(obj.races),
        startAge: toNullableNumber(obj.startAge),
        endAge: toNullableNumber(obj.endAge),
        anyAge: Boolean(obj.anyAge ?? false),
        description:
          typeof obj.description === "string" && obj.description.trim()
            ? obj.description.trim()
            : null,
      } satisfies AutoIngestCharacter;
    })
    .filter((character) => character && character.name)
    .map((character) => character as AutoIngestCharacter);
}

export async function runAutoIngestLLM(scriptText: string): Promise<AutoIngestResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API anahtarı bulunamadı. Lütfen OPENAI_API_KEY ortam değişkenini ayarlayın."
    );
  }

  const client = new OpenAI({ apiKey });
  const model = DEFAULT_MODEL;

  const truncatedScript = scriptText.length > 24000 ? `${scriptText.slice(0, 24000)}...` : scriptText;

  const systemPrompt = `You are an assistant that reads screenplay files for Ducktylo, a platform that connects screenwriters and producers.\n` +
    `Extract precise, concise metadata suitable for database insertion. Return ONLY valid JSON that matches the provided schema.\n` +
    `Use short phrases in English for categorical fields. Do not invent characters or settings that are not in the script.`;

  const userPrompt = {
    role: "user" as const,
    content: [
      {
        type: "text",
        text:
          "Read the following screenplay text and produce metadata. Respond strictly with JSON matching the schema provided. If information is missing, return empty strings or empty arrays rather than hallucinating.",
      },
      {
        type: "text",
        text: `Screenplay text (may be truncated):\n${truncatedScript}`,
      },
      {
        type: "text",
        text:
          "Schema:\n{\n  \"logline\": string,\n  \"synopsis\": string,\n  \"genres\": string[],\n  \"eras\": string[],\n  \"locations\": string[],\n  \"contentWarnings\": string[],\n  \"format\": string | null,\n  \"estimatedPageCount\": number | null,\n  \"characters\": [\n    {\n      \"name\": string,\n      \"role\": string | null,\n      \"genders\": string[],\n      \"races\": string[],\n      \"startAge\": number | null,\n      \"endAge\": number | null,\n      \"anyAge\": boolean,\n      \"description\": string | null\n    }\n  ]\n}\nEnsure the JSON is strictly valid and not wrapped in extra text or code fences.",
      },
    ],
  };

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      userPrompt,
    ],
  });

  const messageContent = completion.choices[0]?.message?.content || "";
  const rawText = sanitizeJsonText(messageContent);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `LLM yanıtı JSON formatında değil veya ayrıştırılamadı: ${
        error instanceof Error ? error.message : "bilinmiyor"
      }`
    );
  }

  const genres = normalizeStringArray(parsed.genres, GENRE_SET);
  const eras = normalizeStringArray(parsed.eras, ERA_SET);
  const locations = normalizeStringArray(parsed.locations, LOCATION_SET);
  const contentWarnings = normalizeStringArray(parsed.contentWarnings, CONTENT_WARNING_SET);

  return {
    logline: typeof parsed.logline === "string" ? parsed.logline.trim() : "",
    synopsis: typeof parsed.synopsis === "string" ? parsed.synopsis.trim() : "",
    genres,
    eras,
    locations,
    contentWarnings,
    format: typeof parsed.format === "string" && parsed.format.trim() ? parsed.format.trim() : null,
    estimatedPageCount: toNullableNumber(parsed.estimatedPageCount),
    characters: normalizeCharacters(parsed.characters),
    model,
    promptTokens: completion.usage?.prompt_tokens ?? null,
    completionTokens: completion.usage?.completion_tokens ?? null,
    rawResponse: completion,
  };
}
