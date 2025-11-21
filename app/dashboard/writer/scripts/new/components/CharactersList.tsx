"use client";

import { CharacterInput } from "../types";

interface CharactersListProps {
  characters: CharacterInput[];
  onEdit: (character: CharacterInput) => void;
  onDelete: (id: string) => void;
}

export function CharactersList({ characters, onEdit, onDelete }: CharactersListProps) {
  if (!characters.length) {
    return <p className="text-sm text-slate-300">Henüz karakter eklenmedi.</p>;
  }

  return (
    <div className="space-y-3">
      {characters.map((character) => (
        <div
          key={character.id}
          className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-start md:justify-between"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-semibold text-white">{character.name}</h4>
              <span className="rounded-full border border-emerald-300/60 px-2 py-1 text-xs text-emerald-200">{character.role}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              {character.genders.length > 0 && <span>Cinsiyet: {character.genders.join(", ")}</span>}
              {character.races.length > 0 && <span>| Irk/Etnisite: {character.races.join(", ")}</span>}
              {!character.anyAge && character.startAge !== null && character.endAge !== null && (
                <span>| Yaş: {character.startAge} - {character.endAge}</span>
              )}
              {character.anyAge && <span>| Yaş: Her yaş olabilir</span>}
            </div>
            {character.description && <p className="text-sm text-slate-300">{character.description}</p>}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(character)}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => onDelete(character.id)}
              className="rounded-lg border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400"
            >
              Sil
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
