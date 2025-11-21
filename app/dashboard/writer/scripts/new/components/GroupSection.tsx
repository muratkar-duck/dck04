"use client";

import { LabeledOption } from "@/lib/scriptClassificationData";
import { TagPill } from "./TagPill";

interface GroupSectionProps {
  title: string;
  options: LabeledOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
}

export function GroupSection({ title, options, selectedValues, onToggle, disabled }: GroupSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-slate-400">{selectedValues.length} seçildi</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <TagPill
            key={option.value}
            selected={selectedValues.includes(option.value)}
            onClick={() => onToggle(option.value)}
            disabled={disabled}
          >
            {option.label}
          </TagPill>
        ))}
      </div>
    </section>
  );
}
