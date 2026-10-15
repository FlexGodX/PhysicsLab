export function checkDocument(name: string, size: number, bytes: Uint8Array) {
  if (size > 10 * 1024 * 1024 || size === 0)
    throw new Error("Документ должен быть от 1 байта до 10 МБ");
  const ext = name.toLowerCase().split(".").at(-1);
  if (ext === "pdf" && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-")
    return "pdf";
  if (
    ext === "docx" &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 3 &&
    bytes[3] === 4
  )
    return "docx";
  throw new Error(
    "Выберите настоящий PDF или DOCX. Формат DOC не поддерживается.",
  );
}
export function checkDocxArchive(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("Повреждённый DOCX");
  const count = v.getUint16(end + 10, true);
  let at = v.getUint32(end + 16, true),
    total = 0,
    document = false;
  if (count > 2000 || count === 0 || v.getUint16(end + 4, true) !== 0)
    throw new Error("Слишком сложный DOCX");
  for (let i = 0; i < count; i++) {
    if (at + 46 > bytes.length || v.getUint32(at, true) !== 0x02014b50)
      throw new Error("Повреждённый архив DOCX");
    const size = v.getUint32(at + 24, true),
      length = v.getUint16(at + 28, true);
    total += size;
    if (total > 20 * 1024 * 1024 || v.getUint16(at + 8, true) & 1)
      throw new Error("DOCX зашифрован или превышает 20 МБ после распаковки");
    if (
      new TextDecoder().decode(bytes.slice(at + 46, at + 46 + length)) ===
      "word/document.xml"
    )
      document = true;
    at += 46 + length + v.getUint16(at + 30, true) + v.getUint16(at + 32, true);
  }
  if (!document) throw new Error("В архиве нет документа Word");
}
