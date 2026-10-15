import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useWorkspace } from "../../src/ui/useWorkspace";
function Harness() {
  const store = useWorkspace();
  const [result, setResult] = useState("");
  return (
    <>
      <button
        disabled={!store.ready || !store.writable}
        onClick={async () =>
          setResult(
            String(
              await store.update({ ...store.data, schemaVersion: 999 as 1 }),
            ),
          )
        }
      >
        Передать неверный снимок
      </button>
      <p data-testid="result">{result}</p>
      <p data-testid="version">{store.data.schemaVersion}</p>
      <p data-testid="memory">{String(store.memory)}</p>
      <p role="status">{store.status}</p>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
