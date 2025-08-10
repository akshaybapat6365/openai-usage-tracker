import { homedir } from 'os';
import { join } from 'path';

export const VERSION = '1.0.0';

// Paths
export const USER_HOME = homedir();
export const CODEX_DIR = join(USER_HOME, '.codex');
export const CODEX_USAGE_DIR = join(USER_HOME, '.codex-usage');
export const USAGE_DATA_FILE = join(CODEX_USAGE_DIR, 'usage.jsonl');

// OpenAI Pricing (per 1K tokens)
export const PRICING = {
  'gpt-4': {
    input: 0.03,
    output: 0.06
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03
  },
  'gpt-4o': {
    input: 0.005,
    output: 0.015
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006
  },
  'o1-preview': {
    input: 0.015,
    output: 0.06
  },
  'o1-mini': {
    input: 0.003,
    output: 0.012
  },
  'o4-mini': {
    input: 0.003,
    output: 0.012
  }
} as const;

export type ModelName = keyof typeof PRICING;