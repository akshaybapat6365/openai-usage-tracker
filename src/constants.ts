import { homedir } from 'os';
import { join } from 'path';

export const VERSION = '1.0.0';

// Paths
export const USER_HOME = homedir();
export const CODEX_DIR = join(USER_HOME, '.codex');
export const CODEX_USAGE_DIR = join(USER_HOME, '.codex-usage');
export const USAGE_DATA_FILE = join(CODEX_USAGE_DIR, 'usage.jsonl');

// OpenAI Pricing (per 1K tokens) - Updated for 2025 models
export const PRICING = {
  // GPT-4 family
  'gpt-4': {
    input: 0.03,
    output: 0.06
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03
  },
  'gpt-4.5': { // New in 2025
    input: 0.02,
    output: 0.04
  },
  'gpt-5': { // Latest flagship model
    input: 0.04,
    output: 0.08
  },
  
  // GPT-4o family
  'gpt-4o': {
    input: 0.005,
    output: 0.015
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006
  },
  
  // O1 reasoning models
  'o1-preview': {
    input: 0.015,
    output: 0.06
  },
  'o1-mini': {
    input: 0.003,
    output: 0.012
  },
  
  // O3 reasoning models (2025)
  'o3': {
    input: 0.025,
    output: 0.10
  },
  'o3-mini': {
    input: 0.005,
    output: 0.02
  },
  'o3-pro': {
    input: 0.05,
    output: 0.20
  },
  
  // O4 models (2025)
  'o4': {
    input: 0.008,
    output: 0.032
  },
  'o4-mini': {
    input: 0.003,
    output: 0.012
  },
  
  // Special models
  'model-max': { // Maximum capability model
    input: 0.10,
    output: 0.40
  }
} as const;

export type ModelName = keyof typeof PRICING;