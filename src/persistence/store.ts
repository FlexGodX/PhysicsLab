import { openDB } from "idb";
import type { Workspace } from "../content/types";
import { emptyWorkspace, validateWorkspace } from "./schema";
const database = () =>
  openDB("physics-lab", 1, {
    upgrade(db) {
      db.createObjectStore("workspace");
    },
  });
export async function loadWorkspace(): Promise<Workspace> {
  const db = await database();
  try {
    const data = await db.get("workspace", "current");
    return data ? validateWorkspace(data) : emptyWorkspace();
  } finally {
    db.close();
  }
}
export async function saveWorkspace(data: Workspace): Promise<void> {
  const checked = validateWorkspace(data);
  const db = await database();
  try {
    const tx = db.transaction("workspace", "readwrite");
    await tx.store.put(checked, "current");
    await tx.done;
  } finally {
    db.close();
  }
}
export function downloadBackup(data: Workspace): void {
  const blob = new Blob(
    [
      JSON.stringify(
        { ...data, exportedAt: new Date().toISOString() },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `physics-lab-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
