import { readFileSync, existsSync } from 'fs';
import Table from 'cli-table3';
import chalk from 'chalk';
import { formatNumber, formatCost, getModelColor } from '../utils/format.js';
import { USAGE_DATA_FILE } from '../constants.js';
import type { UsageEntry, DailyUsage, ModelBreakdown } from '../types.js';

interface DailyOptions {
  from?: string;
  to?: string;
  json?: boolean;
}

export function showDaily(options: DailyOptions) {
  if (!existsSync(USAGE_DATA_FILE)) {
    console.error(chalk.red('No usage data found. Run "codex-usage track" first.'));
    process.exit(1);
  }

  const entries = loadUsageData();
  const dailyData = aggregateDailyUsage(entries, options);

  if (options.json) {
    console.log(JSON.stringify(dailyData, null, 2));
  } else {
    displayDailyTable(dailyData);
  }
}

function loadUsageData(): UsageEntry[] {
  const content = readFileSync(USAGE_DATA_FILE, 'utf-8');
  const lines = content.trim().split('\n');
  
  return lines.map(line => {
    try {
      return JSON.parse(line) as UsageEntry;
    } catch {
      return null;
    }
  }).filter(Boolean) as UsageEntry[];
}

function aggregateDailyUsage(entries: UsageEntry[], options: DailyOptions): DailyUsage[] {
  const daily = new Map<string, DailyUsage>();
  
  for (const entry of entries) {
    const date = entry.timestamp.split('T')[0];
    
    // Filter by date range
    if (options.from && date < options.from) continue;
    if (options.to && date > options.to) continue;
    
    if (!daily.has(date)) {
      daily.set(date, {
        date,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        modelsUsed: [],
        modelBreakdowns: []
      });
    }
    
    const day = daily.get(date)!;
    day.inputTokens += entry.inputTokens;
    day.outputTokens += entry.outputTokens;
    day.totalCost += entry.costUSD;
    
    if (!day.modelsUsed.includes(entry.model)) {
      day.modelsUsed.push(entry.model);
    }
    
    // Update model breakdown
    let modelBreakdown = day.modelBreakdowns.find(m => m.model === entry.model);
    if (!modelBreakdown) {
      modelBreakdown = {
        model: entry.model,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0
      };
      day.modelBreakdowns.push(modelBreakdown);
    }
    
    modelBreakdown.inputTokens += entry.inputTokens;
    modelBreakdown.outputTokens += entry.outputTokens;
    modelBreakdown.totalCost += entry.costUSD;
  }
  
  return Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function displayDailyTable(dailyData: DailyUsage[]) {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║                           📊 DAILY USAGE REPORT                              ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════════════════════════╝\n'));

  const table = new Table({
    head: [
      chalk.bold.white('Date'),
      chalk.bold.white('Input'),
      chalk.bold.white('Output'),
      chalk.bold.white('Cache'),
      chalk.bold.white('Total'),
      chalk.bold.white('Cost (USD)'),
      chalk.bold.white('Models')
    ],
    style: {
      head: [],
      border: [],
      'padding-left': 1,
      'padding-right': 1
    },
    chars: {
      'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
      'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
      'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
      'right': '║', 'right-mid': '╢', 'middle': '│'
    },
    colWidths: [12, 12, 12, 10, 12, 12, 20]
  });
  
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  
  for (const day of dailyData) {
    totalInput += day.inputTokens;
    totalOutput += day.outputTokens;
    totalCost += day.totalCost;
    
    const totalTokens = day.inputTokens + day.outputTokens;
    table.push([
      chalk.gray(day.date),
      formatNumber(day.inputTokens),
      formatNumber(day.outputTokens),
      chalk.dim('0'),
      chalk.bold(formatNumber(totalTokens)),
      formatCost(day.totalCost),
      day.modelsUsed.map(m => getModelColor(m)).join(', ')
    ]);
  }
  
  // Add separator
  table.push([
    chalk.bold.yellow('═══════════'),
    chalk.bold.yellow('═══════════'),
    chalk.bold.yellow('═══════════'),
    chalk.bold.yellow('═════════'),
    chalk.bold.yellow('═══════════'),
    chalk.bold.yellow('═══════════'),
    chalk.bold.yellow('═══════════════════')
  ]);
  
  // Add totals row
  const grandTotal = totalInput + totalOutput;
  table.push([
    chalk.bold.cyan('TOTAL'),
    chalk.bold.white(formatNumber(totalInput)),
    chalk.bold.white(formatNumber(totalOutput)),
    chalk.dim('0'),
    chalk.bold.yellow(formatNumber(grandTotal)),
    chalk.bold.green(formatCost(totalCost)),
    ''
  ]);
  
  console.log(table.toString());
  
  // Add summary statistics
  console.log(chalk.dim('\n────────────────────────────────────────────────────────────────────────────────'));
  console.log(chalk.bold('\n📈 Summary Statistics:'));
  console.log(chalk.gray(`  • Total Days: ${dailyData.length}`));
  console.log(chalk.gray(`  • Average Daily Cost: ${formatCost(totalCost / dailyData.length)}`));
  console.log(chalk.gray(`  • Average Daily Tokens: ${formatNumber(Math.round(grandTotal / dailyData.length))}`));
  console.log(chalk.gray(`  • Total Cost: ${chalk.bold.green(formatCost(totalCost))}`));
}