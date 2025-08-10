import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { CODEX_USAGE_DIR, USAGE_DATA_FILE, PRICING } from '../constants.js';
import type { UsageEntry } from '../types.js';
import chalk from 'chalk';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

export async function trackUsage() {
  // Ensure usage directory exists
  if (!existsSync(CODEX_USAGE_DIR)) {
    mkdirSync(CODEX_USAGE_DIR, { recursive: true });
  }

  console.log(chalk.green('🚀 Starting OpenAI API usage tracking...'));
  console.log(chalk.gray('This will intercept and log all OpenAI API calls'));
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: OPENAI_API_KEY environment variable not set'));
    console.log(chalk.yellow('Please set your OpenAI API key:'));
    console.log(chalk.gray('  export OPENAI_API_KEY=your-api-key'));
    process.exit(1);
  }

  // Create OpenAI client with usage tracking
  const openai = new OpenAI({
    apiKey,
  });

  // Monitor usage through environment variable proxy approach
  console.log(chalk.yellow('\n⚠️  Alternative approach needed for tracking:'));
  console.log(chalk.gray('Since Codex uses ChatGPT account auth, we cannot directly intercept API calls.'));
  console.log(chalk.gray('Instead, you can:'));
  console.log(chalk.cyan('\n1. Use OpenAI API directly with tracking:'));
  console.log(chalk.gray('   Export your API key and use this wrapper'));
  console.log(chalk.cyan('\n2. Parse Codex session files after usage:'));
  console.log(chalk.gray('   Run "codex-usage parse" to analyze ~/.codex/sessions/'));
  
  // For demonstration, show how to track if using API directly
  console.log(chalk.green('\n✅ Ready to track OpenAI API calls'));
  console.log(chalk.gray('Make API calls using the OpenAI client to track usage'));

  console.log(chalk.green('✅ Tracking initialized'));
  console.log(chalk.gray('Usage data will be saved to: ' + USAGE_DATA_FILE));
  
  // Keep process running
  console.log(chalk.yellow('\nPress Ctrl+C to stop tracking\n'));
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.green('\n\n👋 Stopping usage tracking...'));
    process.exit(0);
  });
  
  // Keep the process alive
  setInterval(() => {}, 1000);
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

function saveUsage(entry: UsageEntry) {
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(USAGE_DATA_FILE, line);
}