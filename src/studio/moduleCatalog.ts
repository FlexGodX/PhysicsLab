import type { Workspace } from "../content/types";
import { lmsModules } from "../content/lms/catalog";
import { dayModules } from "../content/day-plan/catalog";
export const bundledModules = [...lmsModules, ...dayModules];
export function studyModules(data: Pick<Workspace, "customModules">) {
  return [...bundledModules, ...data.customModules];
}
export function findStudyModule(
  data: Pick<Workspace, "customModules">,
  id: string,
) {
  return (
    bundledModules.find((m) => m.id === id) ??
    data.customModules.find((m) => m.id === id)
  );
}
