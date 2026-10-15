import { buildDayEntries } from "./build";
import { foundation } from "./foundation";
import { mechanics } from "./mechanics";
import { thermal } from "./thermal";
import { electric } from "./electric";
import { review } from "./review";
import { exam } from "./exam";
export { daySourceName } from "./build";
export const dayEntries = buildDayEntries([
  ...foundation,
  ...mechanics,
  ...thermal,
  ...electric,
  ...review,
  ...exam,
]);
export const dayModules = dayEntries.map((e) => e.module);
export const dayVersions = Object.fromEntries(
  dayModules.map((m) => [m.id, m.version]),
);
