import { mkdir, readFile, writeFile, rename, chmod } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  providerIds,
  validateProvider,
  type ProviderConfig,
  type ProviderId,
} from "./providers.ts";
export type Config = {
  active: ProviderId;
  providers: Partial<Record<ProviderId, ProviderConfig>>;
};
export async function readConfig(dir: string): Promise<Config> {
  try {
    const raw = JSON.parse(await readFile(join(dir, "providers.json"), "utf8"));
    const active = z.enum(providerIds).parse(raw.active);
    const providers: Config["providers"] = {};
    for (const id of providerIds)
      if (raw.providers[id])
        providers[id] = validateProvider({
          ...raw.providers[id],
          provider: id,
        });
    return { active, providers };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return { active: "lmstudio", providers: {} };
    throw new Error(
      "Не удалось прочитать настройки ИИ. Проверьте локальный файл настроек.",
    );
  }
}
export function publicConfig(c: Config) {
  return {
    active: c.active,
    providers: Object.fromEntries(
      providerIds.map((id) => [
        id,
        {
          model: c.providers[id]?.model ?? "",
          baseUrl:
            id === "lmstudio"
              ? (c.providers[id]?.baseUrl ?? "http://127.0.0.1:1234/v1")
              : "",
          hasKey: !!c.providers[id]?.apiKey,
          fastMode: c.providers[id]?.fastMode ?? false,
        },
      ]),
    ),
  };
}
const editSchema = z
  .object({
    provider: z.enum(providerIds),
    model: z.string().trim().max(200),
    baseUrl: z.string().max(300).optional(),
    apiKey: z.string().max(500).optional(),
    removeKey: z.boolean().optional(),
    fastMode: z.boolean().optional(),
  })
  .strict();
export async function saveConfig(dir: string, input: unknown) {
  const edit = editSchema.parse(input),
    current = await readConfig(dir),
    old = current.providers[edit.provider];
  const next = validateProvider({
    provider: edit.provider,
    model: edit.model,
    fastMode: edit.fastMode ?? old?.fastMode ?? false,
    baseUrl: edit.baseUrl ?? old?.baseUrl,
    apiKey: edit.removeKey ? "" : edit.apiKey?.trim() || old?.apiKey || "",
  });
  current.active = edit.provider;
  current.providers[edit.provider] = next;
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const temp = join(dir, `providers-${crypto.randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(current), { mode: 0o600 });
  await rename(temp, join(dir, "providers.json"));
  return publicConfig(current);
}
