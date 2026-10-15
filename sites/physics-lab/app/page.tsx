"use client";
import { useEffect, useState, type ComponentType } from "react";
export default function Home() {
  const [Lab, setLab] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    import("../src/ui/App")
      .then((m) => {
        if (alive) setLab(() => m.App);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return Lab ? (
    <Lab />
  ) : (
    <main style={{ padding: "48px", fontFamily: "system-ui" }}>
      <h1>Физика в действии</h1>
      <p role="status">
        {failed
          ? "Не удалось загрузить лабораторию. Обновите страницу."
          : "Открываем вашу лабораторию…"}
      </p>
    </main>
  );
}
