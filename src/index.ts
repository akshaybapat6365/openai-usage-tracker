#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { trackUsage } from './commands/track.js';
import { showDaily } from './commands/daily.js';
import { showMonthly } from './commands/monthly.js';
import { showSession } from './commands/session.js';
import { parseCodexSessions } from './commands/parse.js';
import { analyzeModelPatterns } from './commands/analyze.js';
import { VERSION } from './constants.js';

const program = new Command();

program
  .name('codex-usage')
  .description('Track and analyze OpenAI Codex usage and costs')
  .version(VERSION);

program
  .command('track')
  .description('Start tracking API usage in real-time')
  .action(trackUsage);

program
  .command('daily')
  .description('Show daily usage report')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--json', 'Output as JSON')
  .action(showDaily);

program
  .command('monthly')
  .description('Show monthly usage report')
  .option('--month <month>', 'Specific month (YYYY-MM)')
  .option('--json', 'Output as JSON')
  .action(showMonthly);

program
  .command('session')
  .description('Show session-based usage report')
  .option('--json', 'Output as JSON')
  .action(showSession);

program
  .command('parse')
  .description('Parse existing Codex session files to extract usage')
  .option('--estimate', 'Show token estimation notice')
  .action(parseCodexSessions);

program
  .command('analyze')
  .description('Advanced analysis to detect actual models used')
  .action(analyzeModelPatterns);

program.parse();