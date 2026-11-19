import type { LLMConfig } from "./types";
import { gemma4, qwen2_5 } from "./models";
export interface ExperimentConfig {
  useExamples: boolean;
  maxExamples: number;
}

export const EXPERIMENT_CONFIG: ExperimentConfig = {
  useExamples: false,
  maxExamples: 2,
};

export const CURRENT_MODEL: LLMConfig = gemma4;
