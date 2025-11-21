"use client";

import { Dispatch, SetStateAction, useMemo } from "react";
import {
  CONTENT_ADVISORY_TOPICS,
  ERA_GROUPS,
  GENRE_GROUPS,
  GroupedOptions,
  LOCATION_GROUPS,
  TAG_GROUPS,
} from "@/lib/scriptClassificationData";
import { GroupSection } from "./GroupSection";
import { TagPill } from "./TagPill";

interface ClassificationCardProps {
  selectedGenres: string[];
  setSelectedGenres: Dispatch<SetStateAction<string[]>>;
  selectedTags: string[];
  setSelectedTags: Dispatch<SetStateAction<string[]>>;
  selectedEras: string[];
  setSelectedEras: Dispatch<SetStateAction<string[]>>;
  selectedLocations: string[];
  setSelectedLocations: Dispatch<SetStateAction<string[]>>;
  selectedContentWarnings: string[];
  setSelectedContentWarnings: Dispatch<SetStateAction<string[]>>;
  noWarnings: boolean;
  setNoWarnings: Dispatch<SetStateAction<boolean>>;
  genreError: string | null;
  setGenreError: Dispatch<SetStateAction<string | null>>;
  tagError: string | null;
  setTagError: Dispatch<SetStateAction<string | null>>;
  eraError: string | null;
  setEraError: Dispatch<SetStateAction<string | null>>;
  locationError: string | null;
  setLocationError: Dispatch<SetStateAction<string | null>>;
}

const CARD_CLASS = "space-y-6 rounded-xl border border-white/10 bg-slate-950/60 p-6";

function renderGroupedOptions(
  groups: GroupedOptions[],
  selectedValues: string[],
  onToggle: (value: string) => void,
  disabled?: boolean
) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <GroupSection
          key={group.group}
          title={group.group}
          options={group.options}
          selectedValues={selectedValues}
          onToggle={onToggle}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

export function ClassificationCard({
  selectedGenres,
  setSelectedGenres,
  selectedTags,
  setSelectedTags,
  selectedEras,
  setSelectedEras,
  selectedLocations,
  setSelectedLocations,
  selectedContentWarnings,
  setSelectedContentWarnings,
  noWarnings,
  setNoWarnings,
  genreError,
  setGenreError,
  tagError,
  setTagError,
  eraError,
  setEraError,
  locationError,
  setLocationError,
}: ClassificationCardProps) {
  const genreGroupByValue = useMemo(() => {
    const map = new Map<string, string>();
    GENRE_GROUPS.forEach((group) => {
      group.options.forEach((option) => map.set(option.value, group.group));
    });
    return map;
  }, []);

  const handleGenreToggle = (value: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(value)) {
        const updated = prev.filter((item) => item !== value);
        setGenreError(null);
        return updated;
      }

      const group = genreGroupByValue.get(value);
      const uniqueGroups = new Set(prev.map((item) => genreGroupByValue.get(item))).size;
      const isNewGroup = !prev.some((item) => genreGroupByValue.get(item) === group);

      if (isNewGroup && uniqueGroups >= 2) {
        setGenreError("En fazla iki tür grubundan seçim yapabilirsiniz.");
        return prev;
      }

      setGenreError(null);
      return [...prev, value];
    });
  };

  const handleTagToggle = (value: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(value)) {
        const updated = prev.filter((item) => item !== value);
        setTagError(updated.length < 3 ? "En az 3 etiket seçmelisin." : null);
        return updated;
      }
      if (prev.length >= 25) {
        setTagError("En fazla 25 etiket seçebilirsin.");
        return prev;
      }
      const updated = [...prev, value];
      if (updated.length >= 3) {
        setTagError(null);
      }
      return updated;
    });
  };

  const handleEraToggle = (value: string) => {
    setSelectedEras((prev) => {
      if (prev.includes(value)) {
        const updated = prev.filter((item) => item !== value);
        setEraError(updated.length === 0 ? "En az bir dönem seçmelisin." : null);
        return updated;
      }
      if (prev.length >= 3) {
        setEraError("En fazla 3 dönem seçebilirsin.");
        return prev;
      }
      const updated = [...prev, value];
      if (updated.length >= 1) {
        setEraError(null);
      }
      return updated;
    });
  };

  const handleLocationToggle = (value: string) => {
    setSelectedLocations((prev) => {
      if (prev.includes(value)) {
        const updated = prev.filter((item) => item !== value);
        setLocationError(null);
        return updated;
      }
      if (prev.length >= 5) {
        setLocationError("En fazla 5 lokasyon ekleyebilirsin.");
        return prev;
      }
      setLocationError(null);
      return [...prev, value];
    });
  };

  const handleContentWarningToggle = (value: string) => {
    if (noWarnings) return;
    setSelectedContentWarnings((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  return (
    <div className={CARD_CLASS}>
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-emerald-300">Sınıflandırma</p>
        <h2 className="text-2xl font-semibold text-white">Gelişmiş Sınıflandırma</h2>
        <p className="text-sm text-slate-300">
          Tür, etiket, dönem, lokasyon ve içerik uyarısı seçimlerin senaryonu doğru kişilere ulaştırmamıza yardımcı olur.
        </p>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-white">Türler</h3>
            <p className="text-xs text-slate-400">En fazla 2 tür grubu</p>
          </div>
          {genreError && <p className="text-sm text-amber-300">{genreError}</p>}
          {renderGroupedOptions(GENRE_GROUPS, selectedGenres, handleGenreToggle)}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-white">Etiketler</h3>
            <p className="text-xs text-slate-400">Minimum 3, maksimum 25</p>
          </div>
          {tagError && <p className="text-sm text-amber-300">{tagError}</p>}
          {renderGroupedOptions(TAG_GROUPS, selectedTags, handleTagToggle)}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-white">Dönemler</h3>
            <p className="text-xs text-slate-400">Minimum 1, maksimum 3</p>
          </div>
          {eraError && <p className="text-sm text-amber-300">{eraError}</p>}
          {renderGroupedOptions(ERA_GROUPS, selectedEras, handleEraToggle)}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-white">Lokasyonlar</h3>
            <p className="text-xs text-slate-400">Maksimum 5</p>
          </div>
          {locationError && <p className="text-sm text-amber-300">{locationError}</p>}
          {renderGroupedOptions(LOCATION_GROUPS, selectedLocations, handleLocationToggle)}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-white">İçerik Uyarıları</h3>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <input
                id="no-warnings"
                type="checkbox"
                checked={noWarnings}
                onChange={(event) => {
                  setNoWarnings(event.target.checked);
                  if (event.target.checked) {
                    setSelectedContentWarnings([]);
                  }
                }}
                className="h-4 w-4 accent-emerald-300"
              />
              <label htmlFor="no-warnings" className="cursor-pointer">
                Bu senaryoda yukarıdaki içerikler bulunmamaktadır.
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTENT_ADVISORY_TOPICS.map((topic) => (
              <TagPill
                key={topic.value}
                selected={selectedContentWarnings.includes(topic.value)}
                onClick={() => handleContentWarningToggle(topic.value)}
                disabled={noWarnings}
              >
                {topic.label}
              </TagPill>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
