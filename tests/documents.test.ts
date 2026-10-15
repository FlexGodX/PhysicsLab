import { it, expect } from "vitest";
import {
  checkDocument,
  checkDocxArchive,
} from "../src/studio/documentValidation";
import { readFileSync } from "node:fs";
it("проверяет тип, сигнатуру и размер перед чтением", () => {
  expect(() => checkDocument("bad.exe", 10, new Uint8Array([1, 2]))).toThrow();
  expect(() =>
    checkDocument("x.pdf", 11 * 1024 * 1024, new TextEncoder().encode("%PDF-")),
  ).toThrow();
  expect(() =>
    checkDocument("x.pdf", 4, new Uint8Array([1, 2, 3, 4])),
  ).toThrow();
  expect(checkDocument("x.pdf", 10, new TextEncoder().encode("%PDF-1.7"))).toBe(
    "pdf",
  );
});
it("проверяет распакованный размер docx до разбора", () => {
  const buffer = readFileSync("e2e/fixtures/physics.docx");
  expect(() => checkDocxArchive(new Uint8Array(buffer))).not.toThrow();
  const bomb = Buffer.from(buffer);
  const at = bomb.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  bomb.writeUInt32LE(100000000, at + 24);
  expect(() => checkDocxArchive(bomb)).toThrow();
});
