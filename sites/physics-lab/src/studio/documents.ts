import { checkDocument, checkDocxArchive } from "./documentValidation";
import documentWorkerUrl from "./document.worker.ts?worker&url";
export async function extractDocument(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Документ превышает 10 МБ");
  const buffer = await file.arrayBuffer();
  if (signal?.aborted) throw new DOMException("Отменено", "AbortError");
  const type = checkDocument(file.name, file.size, new Uint8Array(buffer));
  let text = "";
  if (type === "docx") {
    checkDocxArchive(new Uint8Array(buffer));
    text = await new Promise<string>((resolve, reject) => {
      const worker = new Worker(
        documentWorkerUrl,
        { type: "module" },
      );
      const cleanup = () => {
        clearTimeout(timer);
        worker.terminate();
        signal?.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        reject(new DOMException("Отменено", "AbortError"));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Документ слишком сложен. Разделите его на части."));
      }, 30000);
      signal?.addEventListener("abort", abort, { once: true });
      worker.onmessage = (e) => {
        cleanup();
        if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data.text);
      };
      worker.onerror = () => {
        cleanup();
        reject(new Error("Не удалось прочитать документ"));
      };
      worker.postMessage(buffer, [buffer]);
    });
  } else {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/document-workers/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    const abort = () => {
      void task.destroy();
    };
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 30000);
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 100)
        throw new Error("В PDF больше 100 страниц. Разделите документ.");
      const pages: string[] = [];
      let length = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        if (signal?.aborted) throw new DOMException("Отменено", "AbortError");
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const line = content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("");
        length += line.length;
        if (length > 60000)
          throw new Error(
            "В документе больше 60000 символов. Разделите его на части.",
          );
        pages.push(`[Страница ${i}]\n${line}`);
        page.cleanup();
      }
      text = pages.join("\n\n");
      if (!text.replace(/\[Страница \d+\]/g, "").trim()) text = "";
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      await task.destroy();
    }
  }
  text = text.replace(/\u0000/g, "").trim();
  if (!text)
    throw new Error(
      "Не найден текст. Для скана PDF сначала выполните распознавание (OCR).",
    );
  if (text.length > 60000)
    throw new Error(
      "В документе больше 60000 символов. Разделите его на части.",
    );
  return text;
}
