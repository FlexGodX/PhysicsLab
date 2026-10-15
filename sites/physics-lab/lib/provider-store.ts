import {
  providers,
  providerIds,
  baseAddress,
  type Provider,
} from "./provider-registry";
export interface HostedEnv {
  DB?: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        all<T>(): Promise<{ results: T[] }>;
        first<T>(): Promise<T | null>;
      };
    };
    batch(statements: unknown[]): Promise<unknown>;
  };
  PHYSICS_KEY_ENCRYPTION_KEY?: string;
  [key: string]: unknown;
}
export interface SavedProvider {
  model: string;
  baseUrl: string;
  apiKey: string;
  disabledEnvKey: boolean;
}
function bytes64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
function decode64(text: string) {
  return Uint8Array.from(atob(text), (x) => x.charCodeAt(0));
}
async function cryptoKey(master: string) {
  const bytes = decode64(master);
  if (bytes.length !== 32)
    throw new Error("Не настроено защищённое хранение ключей.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function sealKey(text: string, master: string, aad: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) },
    await cryptoKey(master),
    new TextEncoder().encode(text),
  );
  return `v1.${bytes64(iv)}.${bytes64(new Uint8Array(cipher))}`;
}
export async function openKey(value: string, master: string, aad: string) {
  const [v, iv, cipher] = value.split(".");
  if (v !== "v1") throw new Error("Неизвестная версия ключа.");
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decode64(iv),
        additionalData: new TextEncoder().encode(aad),
      },
      await cryptoKey(master),
      decode64(cipher),
    ),
  );
}
interface Row {
  provider: Provider;
  model: string;
  base_url: string;
  key_cipher: string;
  env_key_disabled: number;
}
export async function loadProviderConfig(env: HostedEnv, user: string) {
  let rows: Row[] = [];
  let active: Provider = "openrouter";
  if (env.DB) {
    rows = (
      await env.DB.prepare(
        "SELECT provider, model, base_url, key_cipher, env_key_disabled FROM ai_provider_settings WHERE owner_id = ?",
      )
        .bind(user)
        .all<Row>()
    ).results;
    const pref = await env.DB.prepare(
      "SELECT provider FROM ai_provider_preferences WHERE owner_id = ?",
    )
      .bind(user)
      .first<{ provider: Provider }>();
    if (pref && providerIds.includes(pref.provider)) active = pref.provider;
  }
  const settings = {} as Record<Provider, SavedProvider>;
  for (const id of providerIds) {
    const row = rows.find((r) => r.provider === id);
    const cipher = row?.key_cipher;
    const apiKey = cipher
      ? await openKey(
          cipher,
          env.PHYSICS_KEY_ENCRYPTION_KEY || "",
          `${user}|${id}`,
        )
      : row?.env_key_disabled
        ? ""
        : String(env[providers[id].keyEnv] || "");
    settings[id] = {
      model: row?.model ?? String(env[id.toUpperCase() + "_MODEL"] || ""),
      baseUrl: baseAddress(id, row?.base_url),
      apiKey,
      disabledEnvKey: Boolean(row?.env_key_disabled),
    };
  }
  return { active, settings };
}
export async function saveProviderConfig(
  env: HostedEnv,
  user: string,
  p: Provider,
  model: string,
  baseUrl: string,
  key: string,
  remove: boolean,
) {
  if (!env.DB || !env.PHYSICS_KEY_ENCRYPTION_KEY)
    throw new Error("Защищённое хранилище не подключено.");
  const address = baseAddress(p, baseUrl);
  const previous = await env.DB.prepare(
    "SELECT base_url, key_cipher, env_key_disabled FROM ai_provider_settings WHERE owner_id = ? AND provider = ?",
  )
    .bind(user, p)
    .first<Pick<Row, "base_url" | "key_cipher" | "env_key_disabled">>();
  if (
    address !== (previous?.base_url || providers[p].baseUrl) &&
    !key &&
    !remove &&
    (previous?.key_cipher ||
      (!previous?.env_key_disabled && env[providers[p].keyEnv]))
  )
    throw new Error("При смене адреса введите ключ заново или удалите его.");
  const cipher = key
    ? await sealKey(key, env.PHYSICS_KEY_ENCRYPTION_KEY, `${user}|${p}`)
    : "";
  const replace = Boolean(key || remove);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO ai_provider_settings(owner_id,provider,model,base_url,key_cipher,env_key_disabled) VALUES(?,?,?,?,?,?) ON CONFLICT(owner_id,provider) DO UPDATE SET model=excluded.model,base_url=excluded.base_url,key_cipher=CASE WHEN ? THEN excluded.key_cipher ELSE ai_provider_settings.key_cipher END,env_key_disabled=CASE WHEN ? THEN excluded.env_key_disabled ELSE ai_provider_settings.env_key_disabled END",
    ).bind(
      user,
      p,
      model,
      address,
      cipher,
      remove ? 1 : 0,
      replace ? 1 : 0,
      replace ? 1 : 0,
    ),
    env.DB.prepare(
      "INSERT INTO ai_provider_preferences(owner_id,provider) VALUES(?,?) ON CONFLICT(owner_id) DO UPDATE SET provider=excluded.provider",
    ).bind(user, p),
  ]);
}
export function publicProviderConfig(
  c: Awaited<ReturnType<typeof loadProviderConfig>>,
) {
  return {
    active: c.active,
    providers: Object.fromEntries(
      [...providerIds, "lmstudio", "codex"].map((id) => [
        id,
        id in c.settings
          ? {
              model: c.settings[id as Provider].model,
              baseUrl: c.settings[id as Provider].baseUrl,
              hasKey: Boolean(c.settings[id as Provider].apiKey),
              fastMode: false,
            }
          : { model: "", baseUrl: "", hasKey: false, fastMode: false },
      ]),
    ),
  };
}
