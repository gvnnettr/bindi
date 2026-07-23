'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode' | 'maxLength' | 'pattern'> {
  value: string;
  onChange: (v: string) => void;
  /** 4 veya 6 rakam */
  length?: 4 | 6;
}

export const PinInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, length = 6, className, placeholder, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        {...rest}
        type="password"
        inputMode="numeric"
        pattern="\d*"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        placeholder={placeholder ?? '••••••'.slice(0, length)}
        className={className ?? 'input tracking-widest text-center'}
      />
    );
  },
);
PinInput.displayName = 'PinInput';
