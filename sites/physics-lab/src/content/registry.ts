import { archivedTasks } from "./archive";
import { k1Tasks } from "./k1";
import { learningUnits } from "./modules";
export const allTasks = [
  ...archivedTasks,
  ...k1Tasks,
  ...Object.values(learningUnits).flatMap((u) => u.tasks),
];
export const findTask = (id: string, version: number) =>
  allTasks.find((t) => t.id === id && t.version === version);
