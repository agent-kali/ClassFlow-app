"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ComboOption {
  id: string;
  /** Primary label, matched against typed text. */
  label: string;
  /** Secondary context shown after the label, also matched. */
  hint?: string;
}

interface Props {
  options: ComboOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Minimal type-ahead combobox: type to filter, arrows to move, Enter to pick.
 * One flat surface — no nested dropdowns anywhere in the create flow.
 */
export function Combobox({ options, value, onChange, placeholder, label, autoFocus, disabled }: Props) {
  const listId = useId();
  const selected = options.find((o) => o.id === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)
      )
    : options;
  const highlightIndex =
    filtered.length === 0 ? 0 : Math.min(highlight, filtered.length - 1);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : (selected ? selected.label : "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && filtered[highlightIndex]) {
            e.preventDefault();
            pick(filtered[highlightIndex].id);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded border border-line bg-raised px-2 py-1.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-50"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded border border-line bg-raised py-1"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          {filtered.length === 0 && (
            <li className="px-2 py-1.5 text-[12px] text-ink-faint">No matches</li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              onPointerDown={(e) => {
                e.preventDefault();
                pick(o.id);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex cursor-pointer items-baseline gap-2 px-2 py-1.5 text-[13px] ${
                i === highlightIndex ? "bg-accent-soft text-accent" : ""
              }`}
            >
              <span className="cf-mono font-medium">{o.label}</span>
              {o.hint && <span className="truncate text-[11px] text-ink-mute">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
