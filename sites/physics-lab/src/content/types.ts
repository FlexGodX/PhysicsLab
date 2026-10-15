import type { LinearParams, LinearState } from "../physics/linear";
export interface TaskVariant {
  id: string;
  version: number;
  templateId: string;
  kind: "concept" | "units" | "calculation" | "prediction";
  prompt: string;
  options?: string[];
  answer: string | number;
  unit?: string;
  critical: boolean;
  outcomeIds: string[];
  explanation: string;
  hints: [string, string, string];
  errorTag: string;
}
export interface Grade {
  valueCorrect: boolean;
  unitCorrect: boolean;
  correct: boolean;
  errorTags: string[];
}
export interface Attempt {
  id: string;
  sessionId: string;
  assessmentId: string | null;
  taskId: string;
  taskVersion: number;
  variantId: string;
  taskSnapshot: TaskVariant;
  answer: string;
  numericAnswer: number | null;
  unit: string;
  hintsUsed: number;
  result: Grade;
  submittedAt: string;
}
export interface Experiment {
  id: string;
  simulationId: "L1";
  modelVersion: number;
  parameterSnapshot: LinearParams;
  samples: LinearState[];
  prediction: string;
  observations: string;
  conclusion: string;
  selfReview: boolean;
  createdAt: string;
  sourceKind: "manual" | "virtual";
  context?: "lesson" | "playground";
}
export interface DiagnosticResponse {
  questionId: string;
  kind: "answer" | "skip" | "unknown";
  answer: string | null;
  at: string;
}
export interface DiagnosticRun {
  id: string;
  version: 1;
  phase: "before" | "after";
  createdAt: string;
  responses: DiagnosticResponse[];
}
export interface StudyPreferences {
  mode: "sequential" | "review";
  minutes: number;
  examDate: string | null;
}
export interface Workspace {
  visualizationExperiments: import("../figures/experiment").VisualizationExperiment[];
  visualizations: (import("zod").infer<
    typeof import("../studio/schema").visualizationSchema
  > & { id: string })[];
  customModules: import("../studio/schema").CustomModule[];
  customRuns: import("../studio/schema").CustomRun[];
  customRead: Record<string, string[]>;
  studyChats: import("../studio/schema").StudyChat[];
  schemaVersion: 1;
  appVersion: string;
  contentVersions: Record<string, number>;
  profileId: string;
  exportedAt: string;
  attempts: Attempt[];
  experiments: Experiment[];
  materialOpenedAt: string | null;
  selfMarkedAt: string | null;
  hintHistory: Record<string, number>;
  moduleMarks: Record<
    string,
    { openedAt: string | null; selfMarkedAt: string | null }
  >;
  modelExperiments: ModelExperiment[];
  diagnostics: DiagnosticRun[];
  preferences: StudyPreferences | null;
}
export interface ModelExperiment {
  id: string;
  modelId: import("../physics/catalog").ModelId;
  modelVersion: 1 | 2;
  parameters: import("../physics/catalog").ModelParams;
  manualValues: number[] | null;
  samples: { phase: number; values: Record<string, number | null> }[];
  prediction: string;
  observations: string;
  conclusion: string;
  selfReview: boolean;
  createdAt: string;
  context: "lesson" | "playground";
}
