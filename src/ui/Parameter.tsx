import { useState } from "react";
import { parseNumber } from "../physics/units";
export function Parameter({
  label,
  value,
  min,
  max,
  step,
  disabled,
  showRange = true,
  integer = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  showRange?: boolean;
  integer?: boolean;
  onChange: (n: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState(false);
  return (
    <div className="parameter">
      <div className="parameter-top">
        <label>
          {label}
          <input
            aria-label={label}
            inputMode="decimal"
            value={raw}
            disabled={disabled}
            aria-invalid={error}
            onChange={(e) => {
              const s = e.target.value;
              setRaw(s);
              const n = parseNumber(s);
              setError(
                n === null ||
                  n < min ||
                  n > max ||
                  (integer && !Number.isInteger(n)),
              );
              if (
                n !== null &&
                n >= min &&
                n <= max &&
                (!integer || Number.isInteger(n))
              )
                onChange(n);
            }}
            onBlur={() => {
              setRaw(String(value));
              setError(false);
            }}
          />
        </label>
      </div>
      {showRange && (
        <input
          aria-label={`${label} — ползунок`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            setRaw(String(n));
            setError(false);
            onChange(n);
          }}
        />
      )}
      <div className="range-ends">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {error && (
        <small className="error">
          Введите число от {min} до {max}.
        </small>
      )}
    </div>
  );
}
