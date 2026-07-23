'use client';

import { forwardRef, useCallback } from 'react';
import type { InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  /** 10 haneli sadece rakam (5054453212) */
  value: string;
  /** 10 haneli sadece rakam callback */
  onChange: (digits: string) => void;
}

function formatDisplay(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 8) return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

export const PhoneInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, className, placeholder, ...rest }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value.replace(/\D/g, '').slice(0, 10));
      },
      [onChange],
    );

    return (
      <div className="flex items-stretch overflow-hidden rounded-lg border border-charcoal-200 bg-white focus-within:border-sunset-400 focus-within:ring-2 focus-within:ring-sunset-100">
        <div className="flex items-center border-r border-charcoal-200 bg-sand-50 px-3 text-sm font-semibold text-charcoal-700">
          +90
        </div>
        <input
          ref={ref}
          {...rest}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          value={formatDisplay(value)}
          onChange={handleChange}
          placeholder={placeholder ?? '(5XX) XXX XX XX'}
          className={
            className ??
            'flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-charcoal-900 outline-none placeholder:text-charcoal-400'
          }
        />
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';

/** Backend'e 05054453212 formatında gönderim için */
export function toBackendPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? '0' + d : d;
}
