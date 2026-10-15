import mammoth from "mammoth/mammoth.browser";
self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: event.data });
    self.postMessage({ text: result.value });
  } catch {
    self.postMessage({
      error:
        "Не удалось прочитать DOCX. Проверьте, что файл не повреждён и не защищён паролем.",
    });
  }
};
