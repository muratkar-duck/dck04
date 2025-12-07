import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { extractTextFromScriptFile } from "@/lib/ai/textExtractor";
import { runAutoIngestLLM } from "@/lib/ai/autoIngest";

const STORAGE_BUCKET = "script_files";

type AutoIngestRequest = {
  scriptId: string;
  fileId?: string;
  storagePath?: string;
};

function createSupabaseClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase yapılandırması eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı olmalıdır."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

function inferFileType(fileType?: string, storagePath?: string): string {
  if (fileType) {
    return fileType;
  }
  if (storagePath) {
    const ext = storagePath.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "docx")
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (ext === "fdx") return "application/xml";
  }
  return "application/pdf";
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null;

  try {
    const body = (await request.json()) as AutoIngestRequest;
    if (!body?.scriptId) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    }

    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .select("id, primary_owner_id")
      .eq("id", body.scriptId)
      .maybeSingle();

    if (scriptError || !script) {
      return NextResponse.json({ error: "Senaryo bulunamadı." }, { status: 404 });
    }

    if (script.primary_owner_id !== authData.user.id) {
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
    }

    let fileRecord: { id: string; storage_path: string; file_type: string | null } | null = null;
    if (body.fileId) {
      const { data, error } = await supabase
        .from("script_files")
        .select("id, storage_path, file_type")
        .eq("id", body.fileId)
        .eq("script_id", body.scriptId)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
      }
      fileRecord = data;
    } else if (body.storagePath) {
      fileRecord = { id: "", storage_path: body.storagePath, file_type: null };
    } else {
      return NextResponse.json({ error: "Dosya bilgisi eksik." }, { status: 400 });
    }

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(fileRecord.storage_path);

    if (downloadError || !downloadData) {
      return NextResponse.json(
        { error: "Dosya indirilemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    const fileBuffer = await downloadData.arrayBuffer();
    const fileType = inferFileType(fileRecord.file_type || undefined, fileRecord.storage_path);
    const scriptText = await extractTextFromScriptFile(fileBuffer, fileType);

    const { data: jobData, error: jobInsertError } = await supabase
      .from("script_ai_ingest_jobs")
      .insert({ script_id: body.scriptId, status: "running" })
      .select("id")
      .maybeSingle();

    if (jobInsertError || !jobData) {
      return NextResponse.json(
        { error: "AI işlemi başlatılamadı. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    jobId = jobData.id;

    const result = await runAutoIngestLLM(scriptText);

    const { data: updatedScripts, error: updateError } = await supabase
      .from("scripts")
      .update({
        logline: result.logline || null,
        synopsis: result.synopsis || null,
        genres: result.genres.length ? result.genres : null,
        eras: result.eras.length ? result.eras : null,
        locations: result.locations.length ? result.locations : null,
        content_warnings: result.contentWarnings,
        format: result.format,
      })
      .eq("id", body.scriptId)
      .select(
        "id, title, logline, synopsis, genres, eras, locations, content_warnings, format"
      );

    if (updateError) {
      throw new Error(updateError.message);
    }

    await supabase.from("script_characters").delete().eq("script_id", body.scriptId);

    let charactersResponse: { id: string }[] = [];
    if (result.characters.length) {
      const { data: insertedCharacters, error: characterError } = await supabase
        .from("script_characters")
        .insert(
          result.characters.map((character) => ({
            script_id: body.scriptId,
            name: character.name,
            role: character.role || "support",
            genders: character.genders,
            races: character.races,
            start_age: character.anyAge ? null : character.startAge,
            end_age: character.anyAge ? null : character.endAge,
            any_age: character.anyAge,
            description: character.description,
          }))
        )
        .select("id");

      if (characterError) {
        throw new Error(characterError.message);
      }

      charactersResponse = insertedCharacters ?? [];
    }

    await supabase
      .from("script_ai_ingest_jobs")
      .update({
        status: "succeeded",
        model: result.model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        raw_response: result.rawResponse as any,
      })
      .eq("id", jobId);

    return NextResponse.json({
      status: "succeeded",
      script: updatedScripts?.[0],
      characters: (result.characters || []).map((character, index) => ({
        id: charactersResponse[index]?.id ?? "",
        name: character.name,
        role: character.role || "support",
        genders: character.genders,
        races: character.races,
        start_age: character.anyAge ? null : character.startAge,
        end_age: character.anyAge ? null : character.endAge,
        any_age: character.anyAge,
        description: character.description,
      })),
      job: { id: jobId, status: "succeeded" },
    });
  } catch (error) {
    if (jobId) {
      const supabase = createSupabaseClient();
      await supabase
        .from("script_ai_ingest_jobs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Bilinmeyen hata",
        })
        .eq("id", jobId);
    }

    const message = error instanceof Error ? error.message : "İşlem sırasında bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
