"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

interface Script {
  id: string;
  primary_owner_id: string;
  title: string;
  logline?: string | null;
  genre?: string | null;
  format?: string | null;
  era?: string | null;
  setting_location_scope?: string | null;
  visibility: "public" | "producers_only" | "private";
  created_at: string;
}

const visibilityStyles: Record<Script["visibility"], string> = {
  public: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  producers_only: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  private: "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

export default function WriterScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    const fetchScripts = async () => {
      setIsLoading(true);
      setError(null);

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

      const { data, error: scriptsError } = await supabase
        .from("scripts")
        .select("*")
        .eq("primary_owner_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (scriptsError) {
        setError(scriptsError.message);
      } else {
        setScripts(data || []);
      }

      setIsLoading(false);
    };

    fetchScripts();
  }, []);

  const renderedContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex w-full justify-center py-12 text-slate-300">Veriler yükleniyor...</div>
      );
    }

    if (error) {
      return (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      );
    }

    if (scripts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 p-10 text-center">
          <p className="text-lg font-semibold">Henüz senaryon yok</p>
          <p className="mt-2 max-w-md text-slate-300">
            İlk senaryonu eklemek için aşağıdaki butonu kullanabilirsin. Dosyanı yükle ve temel bilgileri doldur.
          </p>
          <Link
            href="/dashboard/writer/scripts/new"
            className="mt-6 rounded-lg bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200"
          >
            Yeni Senaryo Oluştur
          </Link>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">{script.title}</h3>
                <p className="text-sm text-slate-300">{script.genre || "Tür belirtilmemiş"}</p>
                <p className="text-xs text-slate-400">
                  Oluşturulma: {new Date(script.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${visibilityStyles[script.visibility]}`}
              >
                {script.visibility.replace("_", " ")}
              </span>
            </div>

            <p className="line-clamp-2 text-sm text-slate-200">{script.logline || "Logline eklenmemiş."}</p>

            <div className="flex items-center justify-end">
              <Link
                href={`/dashboard/writer/scripts/${script.id}`}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200"
              >
                Detay
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  }, [error, isLoading, scripts]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-emerald-300">Writer Paneli</p>
          <h1 className="text-3xl font-semibold">Senaryolarım</h1>
        </div>
        <Link
          href="/dashboard/writer/scripts/new"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200"
        >
          Yeni Senaryo
        </Link>
      </div>

      {renderedContent}
    </main>
  );
}
