"use client";

import { useEffect, useMemo, useState } from "react";
import { CharacterInput } from "../types";
import { TagPill } from "./TagPill";

const ROLE_OPTIONS = [
  "Protagonist",
  "Antagonist",
  "Yardımcı",
  "Anlatıcı",
  "Diğer",
];

const GENDER_OPTIONS = [
  "Female",
  "Male",
  "Non-binary",
  "Transgender",
  "Genderqueer",
  "Intersex",
  "Belirtilmemiş",
];

const RACE_OPTIONS = [
  "Black or African descent",
  "Latinx or Hispanic",
  "White/European descent",
  "Middle Eastern or North African",
  "East Asian",
  "South Asian",
  "Pacific Islander",
  "Indigenous",
  "Mixed/Multiracial",
  "Other",
];

interface CharacterModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (character: CharacterInput) => void;
  editingCharacter: CharacterInput | null;
}

const modalBaseClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur";

export function CharacterModal({ open, onClose, onSave, editingCharacter }: CharacterModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [genders, setGenders] = useState<string[]>([]);
  const [races, setRaces] = useState<string[]>([]);
  const [startAge, setStartAge] = useState<number | null>(null);
  const [endAge, setEndAge] = useState<number | null>(null);
  const [anyAge, setAnyAge] = useState(true);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => !!editingCharacter, [editingCharacter]);

  useEffect(() => {
    if (editingCharacter) {
      setName(editingCharacter.name);
      setRole(editingCharacter.role);
      setGenders(editingCharacter.genders);
      setRaces(editingCharacter.races);
      setStartAge(editingCharacter.startAge);
      setEndAge(editingCharacter.endAge);
      setAnyAge(editingCharacter.anyAge);
      setDescription(editingCharacter.description);
      setError(null);
    } else {
      setName("");
      setRole(ROLE_OPTIONS[0]);
      setGenders([]);
      setRaces([]);
      setStartAge(null);
      setEndAge(null);
      setAnyAge(true);
      setDescription("");
      setError(null);
    }
  }, [editingCharacter]);

  if (!open) return null;

  const toggleSelection = (value: string, current: string[], setState: (values: string[]) => void) => {
    if (current.includes(value)) {
      setState(current.filter((item) => item !== value));
    } else {
      setState([...current, value]);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("İsim zorunlu.");
      return;
    }
    if (!role.trim()) {
      setError("Rol seçimi zorunlu.");
      return;
    }
    if (!anyAge) {
      if (startAge === null || endAge === null) {
        setError("Lütfen yaş aralığını doldurun veya 'Her yaş olabilir' seçin.");
        return;
      }
      if (startAge > endAge) {
        setError("Başlangıç yaşı bitiş yaşından büyük olamaz.");
        return;
      }
    }
    if (description.length > 250) {
      setError("Açıklama 250 karakteri geçemez.");
      return;
    }

    const payload: CharacterInput = {
      id: editingCharacter?.id ?? crypto.randomUUID(),
      name: name.trim(),
      role,
      genders,
      races,
      startAge: anyAge ? null : startAge,
      endAge: anyAge ? null : endAge,
      anyAge,
      description: description.trim(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className={modalBaseClass}>
      <div className="w-full max-w-2xl space-y-4 rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-emerald-300">Karakter</p>
            <h3 className="text-2xl font-semibold text-white">{isEditing ? "Karakteri Düzenle" : "Karakter Ekle"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-200 transition hover:border-emerald-300"
          >
            Kapat
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-200">
            İsim
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
              placeholder="Karakter adı"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Rol
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">Cinsiyet</p>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <TagPill
                  key={option}
                  selected={genders.includes(option)}
                  onClick={() => toggleSelection(option, genders, setGenders)}
                >
                  {option}
                </TagPill>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">Irk / Etnik Köken</p>
            <div className="flex flex-wrap gap-2">
              {RACE_OPTIONS.map((option) => (
                <TagPill
                  key={option}
                  selected={races.includes(option)}
                  onClick={() => toggleSelection(option, races, setRaces)}
                >
                  {option}
                </TagPill>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-200">
            Başlangıç Yaşı
            <input
              type="number"
              min={0}
              value={startAge ?? ""}
              onChange={(event) => setStartAge(event.target.value === "" ? null : Number(event.target.value))}
              disabled={anyAge}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Bitiş Yaşı
            <input
              type="number"
              min={0}
              value={endAge ?? ""}
              onChange={(event) => setEndAge(event.target.value === "" ? null : Number(event.target.value))}
              disabled={anyAge}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <input
            type="checkbox"
            checked={anyAge}
            onChange={(event) => setAnyAge(event.target.checked)}
            className="h-4 w-4 accent-emerald-300"
          />
          Her yaş olabilir
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-200">
          Açıklama <span className="text-xs text-slate-400">(Opsiyonel, max 250 karakter)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={250}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
            placeholder="Karakter hakkında kısa açıklama"
          />
          <p className="text-xs text-slate-400">{description.length}/250</p>
        </label>

        {error && <p className="text-sm text-amber-300">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
