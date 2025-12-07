"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";
import { ClassificationCard } from "./components/ClassificationCard";
import { CharacterModal } from "./components/CharacterModal";
import { CharactersList } from "./components/CharactersList";
import { CharacterInput } from "./types";
import {
  CONTENT_ADVISORY_TOPICS,
  ERA_GROUPS,
  GENRE_GROUPS,
  LOCATION_GROUPS,
} from "@/lib/scriptClassificationData";

const FORMATS = ["Film", "Dizi", "Kısa Film", "Belgesel"];
const ERA_OPTIONS = ["Günümüz", "Geçmiş", "Gelecek", "Alternatif Evren"];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "producers_only", label: "Producers Only" },
  { value: "private", label: "Private" },
] as const;

type VisibilityValue = (typeof VISIBILITY_OPTIONS)[number]["value"];

type ApiCharacter = {
  id: string;
  name: string;
  role: string | null;
  genders: string[];
  races: string[];
  start_age: number | null;
  end_age: number | null;
  any_age: boolean;
  description: string | null;
};

type ApiResponse = {
  status: string;
  script?: {
    id: string;
    title: string;
    logline: string;
    synopsis?: string;
    genres?: string[];
    eras?: string[];
    locations?: string[];
    content_warnings?: string[];
    format?: string | null;
  } | null;
  characters?: ApiCharacter[];
  job?: { id: string; status: string };
  error?: string;
};

export default function NewWriterScriptPage() {
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();

  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [format, setFormat] = useState(FORMATS[0]);
  const [primaryEra, setPrimaryEra] = useState(ERA_OPTIONS[0]);
  const [settingLocationScope, setSettingLocationScope] = useState("");
  const [visibility, setVisibility] = useState<VisibilityValue>("public");
  const [file, setFile] = useState<File | null>(null);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEras, setSelectedEras] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedContentWarnings, setSelectedContentWarnings] = useState<string[]>([]);
  const [noWarnings, setNoWarnings] = useState(false);

  const [genreError, setGenreError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [eraError, setEraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [characters, setCharacters] = useState<CharacterInput[]>([]);
  const [editingCharacter, setEditingCharacter] = useState<CharacterInput | null>(null);
  const [characterModalOpen, setCharacterModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [existingScriptId, setExistingScriptId] = useState<string | null>(null);
  const [existingScriptFileId, setExistingScriptFileId] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);

  const isFileValid = useMemo(() => {
    if (!file) return false;
    const allowed = ["pdf", "docx", "fdx"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    return !!ext && allowed.includes(ext);
  }, [file]);

  const genreGroupByValue = useMemo(() => {
    const map = new Map<string, string>();
    GENRE_GROUPS.forEach((group) => {
      group.options.forEach((option) => map.set(option.value, group.group));
    });
    return map;
  }, []);

  const genreOptionSet = useMemo(
    () => new Set(GENRE_GROUPS.flatMap((group) => group.options.map((option) => option.value))),
    []
  );
  const eraOptionSet = useMemo(
    () => new Set(ERA_GROUPS.flatMap((group) => group.options.map((option) => option.value))),
    []
  );
  const locationOptionSet = useMemo(
    () => new Set(LOCATION_GROUPS.flatMap((group) => group.options.map((option) => option.value))),
    []
  );
  const contentWarningOptionSet = useMemo(
    () => new Set(CONTENT_ADVISORY_TOPICS.map((topic) => topic.value)),
    []
  );

  const validateClassification = () => {
    if (!selectedGenres.length) {
      setGenreError("En az bir tür seçmelisin.");
      return false;
    }
    const uniqueGenreGroups = new Set(selectedGenres.map((value) => genreGroupByValue.get(value))).size;
    if (uniqueGenreGroups > 2) {
      setGenreError("En fazla iki tür grubundan seçim yapabilirsiniz.");
      return false;
    }
    if (selectedTags.length < 3) {
      setTagError("En az 3 etiket seçmelisin.");
      return false;
    }
    if (selectedTags.length > 25) {
      setTagError("En fazla 25 etiket seçebilirsin.");
      return false;
    }
    if (selectedEras.length < 1) {
      setEraError("En az bir dönem seçmelisin.");
      return false;
    }
    if (selectedEras.length > 3) {
      setEraError("En fazla 3 dönem seçebilirsin.");
      return false;
    }
    if (selectedLocations.length > 5) {
      setLocationError("En fazla 5 lokasyon ekleyebilirsin.");
      return false;
    }

    setGenreError(null);
    setTagError(null);
    setEraError(null);
    setLocationError(null);
    return true;
  };

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const filterValues = (values: string[] | undefined | null, allowed: Set<string>) => {
    if (!values) return [];
    return values.filter((value) => allowed.has(value));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      if (!supabase) {
        throw new Error("Supabase yapılandırması eksik. Lütfen daha sonra tekrar dene.");
      }
      if (!file) {
        throw new Error("Lütfen PDF, DOCX veya FDX formatında bir dosya yükleyin.");
      }
      if (!isFileValid) {
        throw new Error("Desteklenmeyen dosya formatı. Sadece PDF, DOCX veya FDX yükleyin.");
      }
      if (!validateClassification()) {
        throw new Error("Lütfen sınıflandırma alanlarındaki uyarıları düzeltin.");
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error(
          userError?.message || "Giriş yapmış bir kullanıcı bulunamadı. Lütfen tekrar giriş yapın."
        );
      }

      const scriptId = existingScriptId ?? crypto.randomUUID();
      const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const storagePath = existingStoragePath ?? `scripts/${scriptId}/main.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("script_files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const payload = {
        id: scriptId,
        primary_owner_id: userData.user.id,
        title: title.trim(),
        logline: logline.trim(),
        synopsis: synopsis.trim() || null,
        genre: selectedGenres,
        format,
        era: primaryEra,
        setting_location_scope: settingLocationScope.trim() || null,
        visibility,
        genres: selectedGenres.length ? selectedGenres : null,
        tags: selectedTags.length ? selectedTags : null,
        eras: selectedEras.length ? selectedEras : null,
        locations: selectedLocations.length ? selectedLocations : null,
        content_warnings: noWarnings ? [] : selectedContentWarnings,
      };

      if (existingScriptId) {
        const { error: updateError } = await supabase.from("scripts").update(payload).eq("id", scriptId);
        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase.from("scripts").insert(payload);
        if (insertError) {
          throw new Error(insertError.message);
        }
        setExistingScriptId(scriptId);
      }

      if (existingScriptFileId) {
        const { error: fileUpdateError } = await supabase
          .from("script_files")
          .update({ storage_path: storagePath, file_type: extension })
          .eq("id", existingScriptFileId);

        if (fileUpdateError) {
          throw new Error(fileUpdateError.message);
        }
      } else {
        const { data: insertedFile, error: fileInsertError } = await supabase
          .from("script_files")
          .insert({
            script_id: scriptId,
            storage_path: storagePath,
            file_type: extension,
          })
          .select("id")
          .maybeSingle();

        if (fileInsertError) {
          throw new Error(fileInsertError.message);
        }

        if (insertedFile?.id) {
          setExistingScriptFileId(insertedFile.id);
        }
      }

      if (existingScriptId) {
        await supabase.from("script_characters").delete().eq("script_id", scriptId);
      }

      if (characters.length) {
        const { error: characterInsertError } = await supabase.from("script_characters").insert(
          characters.map((character) => ({
            script_id: scriptId,
            name: character.name.trim(),
            role: character.role,
            genders: character.genders,
            races: character.races,
            start_age: character.anyAge ? null : character.startAge,
            end_age: character.anyAge ? null : character.endAge,
            any_age: character.anyAge,
            description: character.description.trim() || null,
          }))
        );

        if (characterInsertError) {
          throw new Error(characterInsertError.message);
        }
      }

      setExistingStoragePath(storagePath);
      setSuccess("Senaryo başarıyla oluşturuldu!");
      router.push(`/dashboard/writer/scripts/${scriptId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "İşlem sırasında bir hata oluştu.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoIngest = async () => {
    resetMessages();
    setIngestError(null);
    if (!supabase) {
      setIngestError("Supabase yapılandırması eksik. Lütfen daha sonra tekrar dene.");
      return;
    }
    if (!file) {
      setIngestError("AI için önce bir dosya yüklemelisin.");
      return;
    }
    if (!isFileValid) {
      setIngestError("Desteklenmeyen dosya formatı. Sadece PDF, DOCX veya FDX yükleyin.");
      return;
    }

    setIsIngesting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error(
          userError?.message || "Giriş yapmış bir kullanıcı bulunamadı. Lütfen tekrar giriş yapın."
        );
      }

      const scriptId = existingScriptId ?? crypto.randomUUID();
      const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const storagePath = existingStoragePath ?? `scripts/${scriptId}/main.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("script_files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const payload = {
        id: scriptId,
        primary_owner_id: userData.user.id,
        title: title.trim() || "Adsız Senaryo",
        logline: logline.trim() || "",
        synopsis: synopsis.trim() || null,
        genre: selectedGenres,
        format,
        era: primaryEra,
        setting_location_scope: settingLocationScope.trim() || null,
        visibility,
        genres: selectedGenres.length ? selectedGenres : null,
        tags: selectedTags.length ? selectedTags : null,
        eras: selectedEras.length ? selectedEras : null,
        locations: selectedLocations.length ? selectedLocations : null,
        content_warnings: noWarnings ? [] : selectedContentWarnings,
      };

      if (existingScriptId) {
        const { error: updateError } = await supabase.from("scripts").update(payload).eq("id", scriptId);
        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase.from("scripts").insert(payload);
        if (insertError) {
          throw new Error(insertError.message);
        }
        setExistingScriptId(scriptId);
      }

      let fileId = existingScriptFileId;
      if (fileId) {
        const { error: fileUpdateError } = await supabase
          .from("script_files")
          .update({ storage_path: storagePath, file_type: extension })
          .eq("id", fileId);
        if (fileUpdateError) {
          throw new Error(fileUpdateError.message);
        }
      } else {
        const { data: insertedFile, error: fileInsertError } = await supabase
          .from("script_files")
          .insert({ script_id: scriptId, storage_path: storagePath, file_type: extension })
          .select("id")
          .maybeSingle();

        if (fileInsertError) {
          throw new Error(fileInsertError.message);
        }

        fileId = insertedFile?.id ?? null;
        if (fileId) {
          setExistingScriptFileId(fileId);
        }
      }

      setExistingStoragePath(storagePath);

      const response = await fetch("/api/ai/auto-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId, fileId: fileId ?? undefined, storagePath }),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "AI işlemi başarısız oldu.");
      }

      if (data.script?.title && !title.trim()) {
        setTitle(data.script.title);
      }
      if (data.script?.logline) {
        setLogline(data.script.logline);
      }
      if (data.script?.synopsis) {
        setSynopsis(data.script.synopsis);
      }
      if (data.script?.format) {
        setFormat(data.script.format);
      }
      if (Array.isArray(data.script?.genres)) {
        setSelectedGenres(filterValues(data.script?.genres, genreOptionSet));
      }
      if (Array.isArray(data.script?.eras)) {
        setSelectedEras(filterValues(data.script?.eras, eraOptionSet));
      }
      if (Array.isArray(data.script?.locations)) {
        setSelectedLocations(filterValues(data.script?.locations, locationOptionSet));
      }
      if (Array.isArray(data.script?.content_warnings)) {
        const warnings = filterValues(data.script?.content_warnings, contentWarningOptionSet);
        setSelectedContentWarnings(warnings);
        setNoWarnings(warnings.length === 0);
      }

      if (Array.isArray(data.characters)) {
        const mappedCharacters = data.characters.map((character) => ({
          id: character.id || crypto.randomUUID(),
          name: character.name,
          role: character.role || "support",
          genders: character.genders ?? [],
          races: character.races ?? [],
          startAge: character.any_age ? null : character.start_age,
          endAge: character.any_age ? null : character.end_age,
          anyAge: character.any_age,
          description: character.description ?? "",
        }));
        setCharacters(mappedCharacters);
      }

      setSuccess("AI içeriği başarıyla dolduruldu. İstersen güncelleyip kaydedebilirsin.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI işlemi sırasında bir hata oluştu.";
      setIngestError(message);
    } finally {
      setIsIngesting(false);
    }
  };

  const openCharacterModal = () => {
    setEditingCharacter(null);
    setCharacterModalOpen(true);
  };

  const closeCharacterModal = () => {
    setCharacterModalOpen(false);
    setEditingCharacter(null);
  };

  const handleSaveCharacter = (character: CharacterInput) => {
    setCharacters((prev) => {
      const existing = prev.find((item) => item.id === character.id);
      if (existing) {
        return prev.map((item) => (item.id === character.id ? character : item));
      }
      return [...prev, character];
    });
    closeCharacterModal();
  };

  const handleEditCharacter = (character: CharacterInput) => {
    setEditingCharacter(character);
    setCharacterModalOpen(true);
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((character) => character.id !== id));
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-widest text-emerald-300">Yeni Senaryo</p>
        <h1 className="text-3xl font-semibold text-white">Senaryo Oluştur</h1>
        <p className="text-slate-300">
          Temel bilgileri doldur, sınıflandırmalarını seç ve karakterlerini ekle. Dosyan yüklendikten sonra detay sayfasına yönlendirileceksin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="space-y-6 rounded-xl border border-white/10 bg-slate-950/60 p-6">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-widest text-emerald-300">Temel Bilgiler</p>
            <h2 className="text-2xl font-semibold text-white">Senaryo Bilgileri</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Başlık
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                placeholder="Senaryo başlığı"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-200">
              Format
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
              >
                {FORMATS.map((option) => (
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
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                placeholder="Kısa özet"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
              Sinopsis
              <textarea
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value)}
                className="h-24 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                placeholder="Senaryonun kısa özeti"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-200">
              Temel Era
              <select
                value={primaryEra}
                onChange={(event) => setPrimaryEra(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
              >
                {ERA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-200">
              Mekan Kapsamı
              <input
                type="text"
                value={settingLocationScope}
                onChange={(event) => setSettingLocationScope(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
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
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-300"
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
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAutoIngest}
                disabled={!file || !isFileValid || isIngesting}
                className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300/60"
              >
                {isIngesting ? "AI çalışıyor..." : "AI ile doldur"}
              </button>
            </div>
            {isIngesting && (
              <p className="text-xs text-slate-300">AI senaryonu okuyor, lütfen bekle…</p>
            )}
            {ingestError && <p className="text-xs text-red-400">{ingestError}</p>}
          </div>
        </div>

        <ClassificationCard
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          selectedEras={selectedEras}
          setSelectedEras={setSelectedEras}
          selectedLocations={selectedLocations}
          setSelectedLocations={setSelectedLocations}
          selectedContentWarnings={selectedContentWarnings}
          setSelectedContentWarnings={setSelectedContentWarnings}
          noWarnings={noWarnings}
          setNoWarnings={setNoWarnings}
          genreError={genreError}
          setGenreError={setGenreError}
          tagError={tagError}
          setTagError={setTagError}
          eraError={eraError}
          setEraError={setEraError}
          locationError={locationError}
          setLocationError={setLocationError}
        />

        <div className="space-y-4 rounded-xl border border-white/10 bg-slate-950/60 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-emerald-300">Karakterler</p>
              <h2 className="text-2xl font-semibold text-white">Karakter Listesi</h2>
              <p className="text-sm text-slate-300">Ana ve yardımcı karakterlerini ekle, düzenle veya sil.</p>
            </div>
            <button
              type="button"
              onClick={openCharacterModal}
              className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
            >
              Karakter Ekle
            </button>
          </div>

          <CharactersList characters={characters} onEdit={handleEditCharacter} onDelete={handleDeleteCharacter} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-300">{success}</p>}

        <button
          type="submit"
          disabled={isSubmitting || isIngesting}
          className="w-full rounded-lg bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300/60"
        >
          {isSubmitting ? "Kaydediliyor..." : "Senaryoyu Oluştur"}
        </button>
      </form>

      <CharacterModal
        open={characterModalOpen}
        onClose={closeCharacterModal}
        onSave={handleSaveCharacter}
        editingCharacter={editingCharacter}
      />
    </main>
  );
}
