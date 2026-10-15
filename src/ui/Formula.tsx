import { useEffect, useRef, useState } from "react";

export function Formula({
  expression,
  words,
  units,
  condition,
  symbols = [],
}: {
  expression: string;
  words: string;
  units: string;
  condition: string;
  symbols?: import("./symbols").SymbolInfo[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const symbol = symbols.find((s) => s.symbol === selected);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    void import("katex").then(({ default: katex }) => {
      if (!cancelled && ref.current) {
        const parts = expression.split(/,\\quad\s*/);
        const displayed =
          parts.length > 1
            ? "\\begin{gathered}" + parts.join("\\\\") + "\\end{gathered}"
            : expression;
        katex.render(displayed, ref.current, {
          throwOnError: false,
          trust: false,
          displayMode: true,
          output: "htmlAndMathml",
        });
        const display =
          ref.current.querySelector<HTMLElement>(".katex-display");
        if (display) display.tabIndex = 0;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [expression]);
  return (
    <div className="formula">
      <div ref={ref} />
      {symbols.length > 0 && (
        <div>
          <p className="small">Нажмите обозначение:</p>
          <div className="row">
            {symbols.map((s) => (
              <button
                key={s.symbol}
                aria-pressed={selected === s.symbol}
                onClick={() => setSelected(s.symbol)}
              >
                {s.symbol}
              </button>
            ))}
          </div>
          {symbol && (
            <p role="status">
              <strong>{symbol.meaning}</strong> · {symbol.unit}. В сцене:{" "}
              {symbol.scene}.
            </p>
          )}
        </div>
      )}
      <div className="formula-details">
        <details>
          <summary>Прочитать словами</summary>
          <p>{words}</p>
        </details>
        <details>
          <summary>Единицы</summary>
          <p>{units}</p>
        </details>
        <details>
          <summary>Когда применимо</summary>
          <p>{condition}</p>
        </details>
      </div>
    </div>
  );
}
