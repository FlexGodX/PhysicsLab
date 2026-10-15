import { mechanics } from "./mechanics";
import { thermal } from "./thermal";
import { electric } from "./electric";
export {
  lmsCourseUrl,
  lmsVerifiedDate,
  lmsGroups,
  lmsSources,
} from "./inventory";
export const lmsEntries = [...mechanics, ...thermal, ...electric];
export const lmsModules = lmsEntries.map((e) => e.module);
export const lmsVersions = Object.fromEntries(
  lmsModules.map((m) => [m.id, m.version]),
);
