import { useEffect, useRef } from "react";
function MathText({ text, display }: { text: string; display: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let cancelled = false;
    void import("katex").then(({ default: k }) => {
      if (!cancelled && ref.current)
        k.render(text, ref.current, {
          displayMode: display,
          throwOnError: false,
          trust: false,
          maxExpand: 500,
          maxSize: 10,
        });
    });
    return () => {
      cancelled = true;
    };
  }, [text, display]);
  return (
    <span ref={ref} className="study-math">
      {text}
    </span>
  );
}
export function StudyText({ text }: { text: string }) {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return (
    <div className="study-text">
      {parts.map((part, i) =>
        part.startsWith("$$") ? (
          <MathText key={i} text={part.slice(2, -2)} display />
        ) : part.startsWith("$") ? (
          <MathText key={i} text={part.slice(1, -1)} display={false} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  );
}
