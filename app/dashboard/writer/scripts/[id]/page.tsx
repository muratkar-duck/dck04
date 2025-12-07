"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

type Visibility = "public" | "producers_only" | "private";

interface ScriptDetail {
  id: string;
  title: string;
  logline: string | null;
  genre: string | null;
  format: string | null;
  era: string | null;
  setting_location_scope: string | null;
  visibility: Visibility;
  created_at: string;
}

interface ScriptFile {
  storage_path: string;
  file_type: string | null;
}

export default function WriterScriptDetailPage() {
  const params = useParams();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [file, setFile] = useState<ScriptFile | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getBrowserSupabaseClient();
  const scriptId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  useEffect(() => {
    const fetchScript = async () => {
      if (!scriptId) {
        setError("Geçersiz senaryo kimliği.");
        setIsLoading(false);
        return;
      }

      if (!supabase) {
        setError("Supabase yapılandırması eksik. Lütfen daha sonra tekrar dene.");
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError(
          userError?.message ||
            "Giriş yapmış bir kullanıcı bulunamadı. Lütfen tekrar giriş yapmayı dene."
        );
        setIsLoading(false);
        return;
      }

      const { data: scriptData, error: scriptError } = await supabase
        .from("scripts")
        .select("*")
        .eq("id", scriptId)
        .eq("primary_owner_id", userData.user.id)
        .single();

      if (scriptError) {
        setError(scriptError.message);
        setIsLoading(false);
        return;
      }

      setScript(scriptData as ScriptDetail);

      const { data: fileData, error: fileError } = await supabase
        .from("script_files")
        .select("storage_path, file_type")
        .eq("script_id", scriptId)
        .limit(1)
        .single();

      if (fileError && fileError.code !== "PGRST116") {
        setError(fileError.message);
        setIsLoading(false);
        return;
      }

      if (fileData) {
        setFile(fileData as ScriptFile);
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("script_files")
          .createSignedUrl(fileData.storage_path, 60 * 60); // 1 saatlik erişim

        if (!signedUrlError && signedUrlData?.signedUrl) {
          setDownloadUrl(signedUrlData.signedUrl);
        }
      }

      setIsLoading(false);
    };

    fetchScript();
  }, [scriptId, supabase]);

  const visibilityBadge = useMemo(() => {
    if (!script) return null;

    const styleMap: Record<Visibility, string> = {
      public: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      producers_only: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      private: "bg-slate-500/10 text-slate-300 border-slate-500/30",
    };

    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styleMap[script.visibility]}`}
      >
        {script.visibility.replace("_", " ")}
      </span>
    );
  }, [script]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-emerald-300">Senaryo Detayı</p>
          <h1 className="text-3xl font-semibold">{script?.title || "Senaryo"}</h1>
        </div>
        <Link
          href="/dashboard/writer/scripts"
          className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200"
        >
          Listeye Dön
        </Link>
      </div>

      {isLoading && (
        <div className="flex w-full justify-center py-12 text-slate-300">Yükleniyor...</div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>
      )}

      {!isLoading && !error && script && (
        <section className="space-y-6 rounded-xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center gap-3">
            {visibilityBadge}
            <p className="text-sm text-slate-400">
              Oluşturulma tarihi: {new Date(script.created_at).toLocaleDateString("tr-TR")}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Logline</p>
              <p className="mt-1 text-base text-white">{script.logline || "Eklenmemiş"}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-slate-400">Tür</p>
                <p className="text-white">{script.genre || "Belirtilmemiş"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-slate-400">Format</p>
                <p className="text-white">{script.format || "Belirtilmemiş"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-slate-400">Dönem</p>
                <p className="text-white">{script.era || "Belirtilmemiş"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-slate-400">Mekan Kapsamı</p>
                <p className="text-white">{script.setting_location_scope || "Belirtilmemiş"}</p>
              </div>
            </div>
          </div>

          {file && (
            <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Senaryo Dosyası</p>
                  <p className="text-xs text-slate-400">{file.storage_path}</p>
                </div>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
                  >
                    PDF&apos;yi indir
                  </a>
                )}
              </div>
              {!downloadUrl && (
                <p className="text-xs text-amber-300">İndirme bağlantısı hazırlanırken lütfen bekleyin.</p>
              )}
            </div>
          )}

          {!file && (
            <p className="text-sm text-slate-300">Bu senaryoya bağlı bir dosya bulunamadı.</p>
          )}
        </section>
      )}
    </main>
  );
}
