"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

const GENRES = [
  "Drama",
  "Komedi",
  "Aksiyon",
  "Bilim Kurgu",
  "Gerilim",
  "Romantik",
  "Korku",
];

const FORMATS = ["Film", "Dizi", "Kısa Film", "Belgesel"];
const ERAS = ["Günümüz", "Geçmiş", "Gelecek", "Alternatif Evren"];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "producers_only", label: "Producers Only" },
  { value: "private", label: "Private" },
] as const;

type VisibilityValue = (typeof VISIBILITY_OPTIONS)[number]["value"];

export default function NewWriterScriptPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [era, setEra] = useState(ERAS[0]);
  const [settingLocationScope, setSettingLocationScope] = useState("");
  const [visibility, setVisibility] = useState<VisibilityValue>("public");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = getBrowserSupabaseClient();

  const isFileValid = useMemo(() => {
    if (!file) return false;
    const allowed = ["pdf", "docx", "fdx"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    return !!ext && allowed.includes(ext);
  }, [file]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (!supabase) {
        throw new Error("Supabase yapılandırması eksik. Lütfen daha sonra tekrar dene.");
      }

      if (!file) {
        throw new Error("Lütfen PDF, DOCX veya FDX formatında bir dosya yükleyin.");
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error(
          userError?.message || "Giriş yapmış bir kullanıcı bulunamadı. Lütfen tekrar giriş yapın."
        );
      }

      if (!isFileValid) {
        throw new Error("Desteklenmeyen dosya formatı. Sadece PDF, DOCX veya FDX yükleyin.");
      }

      const scriptId = crypto.randomUUID();
      const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const storagePath = `scripts/${scriptId}/main.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("scripts")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: insertError } = await supabase.from("scripts").insert({
        id: scriptId,
        primary_owner_id: userData.user.id,
        title: title.trim(),
        logline: logline.trim(),
        genre,
        format,
        era,
        setting_location_scope: settingLocationScope.trim() || null,
        visibility,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      const { error: fileInsertError } = await supabase.from("script_files").insert({
        script_id: scriptId,
        storage_path: storagePath,
        file_type: extension,
      });

      if (fileInsertError) {
        throw new Error(fileInsertError.message);
      }

      setSuccess("Senaryo başarıyla oluşturuldu!");
      router.push(`/dashboard/writer/scripts/${scriptId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "İşlem sırasında bir hata oluştu.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-widest text-emerald-300">Yeni Senaryo</p>
        <h1 className="text-3xl font-semibold">Senaryo Oluştur</h1>
        <p className="text-slate-300">
          Temel bilgileri doldurup senaryonu yükleyerek hızlıca ekleyebilirsin. Dosyan senaryoya bağlandıktan sonra
          detay sayfasına yönlendirileceksin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-200">
            Başlık
            <input
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
              placeholder="Senaryo başlığı"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Tür (Genre)
            <select
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
            >
              {GENRES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
            Logline
            <input
              type="text"
              required
              value={logline}
              onChange={(event) => setLogline(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
              placeholder="Kısa özet"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
            >
              {FORMATS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Era
            <select
              value={era}
              onChange={(event) => setEra(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
            >
              {ERAS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
            Mekan Kapsamı
            <input
              type="text"
              value={settingLocationScope}
              onChange={(event) => setSettingLocationScope(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
              placeholder="Örn: İstanbul, global, kırsal"
            />
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-200">Görünürlük</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-300"
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={visibility === option.value}
                  onChange={() => setVisibility(option.value)}
                  className="h-4 w-4 accent-emerald-300"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2 text-sm font-medium text-slate-200">
          <span>Senaryo Dosyası (PDF, DOCX veya FDX)</span>
          <input
            type="file"
            accept=".pdf,.docx,.fdx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="w-full text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-300 file:px-4 file:py-2 file:font-semibold file:text-slate-950 file:hover:bg-emerald-200"
          />
          {!isFileValid && file && (
            <p className="text-xs text-amber-300">Geçerli bir PDF, DOCX veya FDX dosyası yüklediğinden emin ol.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-300">{success}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300/60"
        >
          {isSubmitting ? "Kaydediliyor..." : "Senaryoyu Oluştur"}
        </button>
      </form>
    </main>
  );
}
