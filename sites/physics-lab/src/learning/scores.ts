import type { Workspace } from "../content/types";
import { deriveProgress } from "./progress";
import { deriveUnitProgress } from "./unitProgress";
import { learningUnits, type ExtraUnitId } from "../content/modules";
export function moduleScore(data: Workspace, id: "K1" | ExtraUnitId) {
  const p =
    id === "K1"
      ? deriveProgress(data.attempts, data.experiments)
      : deriveUnitProgress(id, data.attempts, data.modelExperiments);
  const read =
    id === "K1" ? !!data.materialOpenedAt : !!data.moduleMarks[id]?.openedAt;
  const experiment =
    id === "K1"
      ? data.experiments.some(
          (e) => e.context !== "playground" && e.conclusion.trim(),
        )
      : data.modelExperiments.some(
          (e) =>
            e.modelId === learningUnits[id].modelId &&
            e.context === "lesson" &&
            e.conclusion.trim(),
        );
  const last = p.checks.at(-1);
  const points = last ? last.score * 20 : null;
  return {
    points,
    accuracy: points,
    completion: Math.round(
      (100 * (Number(read) + Number(experiment) + Number(p.demonstrated))) / 3,
    ),
  };
}
