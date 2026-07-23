'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function norm(s: string) {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyText,
  allowFreeText = true,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  allowFreeText?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!allowFreeText) setQuery(value); // seçim yoksa geri sar
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [value, allowFreeText]);

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 40);
    const n = norm(query);
    return options.filter((o) => norm(o).includes(n)).slice(0, 40);
  }, [query, options]);

  function pick(v: string) {
    onChange(v);
    setQuery(v);
    setOpen(false);
  }

  return (
    <div className={'relative ' + (className ?? '')} ref={wrapRef}>
      <input
        className="input pr-9"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (allowFreeText) onChange(e.target.value);
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-y-0 right-2 flex items-center text-charcoal-400 hover:text-charcoal-600"
        onClick={() => setOpen((v) => !v)}
        aria-label="Aç"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-charcoal-200 bg-white p-1 shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-charcoal-500">
              {emptyText ?? 'Liste boş — serbestçe yazabilirsiniz.'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-charcoal-500">
              Eşleşen yok. {allowFreeText && 'Yazdığınız değerle kaydedilir.'}
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pick(o)}
                className={
                  'block w-full rounded-md px-3 py-1.5 text-left text-sm transition ' +
                  (value === o
                    ? 'bg-sunset-100 text-sunset-800'
                    : 'text-charcoal-800 hover:bg-sand-100')
                }
              >
                {o}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
