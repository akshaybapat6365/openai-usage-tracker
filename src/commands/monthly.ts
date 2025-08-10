import { readFileSync, existsSync } from 'fs';
import Table from 'cli-table3';
import chalk from 'chalk';
import { formatNumber, formatCost, getModelColor } from '../utils/format.js';
import { USAGE_DATA_FILE } from '../constants.js';
import type { UsageEntry, MonthlyUsage } from '../types.js';

interface MonthlyOptions {
  month?: string;
  json?: boolean;
}

export function showMonthly(options: MonthlyOptions) {
  if (!existsSync(USAGE_DATA_FILE)) {
    console.error(chalk.red('No usage data found. Run "codex-usage track" first.'));
    process.exit(1);
  }

  const entries = loadUsageData();
  const monthlyData = aggregateMonthlyUsage(entries, options);

  if (options.json) {
    console.log(JSON.stringify(monthlyData, null, 2));
  } else {
    displayMonthlyTable(monthlyData);
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

function aggregateMonthlyUsage(entries: UsageEntry[], options: MonthlyOptions): MonthlyUsage[] {
  const monthly = new Map<string, MonthlyUsage>();
  
  for (const entry of entries) {
    const month = entry.timestamp.substring(0, 7); // YYYY-MM
    
    // Filter by specific month if provided
    if (options.month && month !== options.month) continue;
    
    if (!monthly.has(month)) {
      monthly.set(month, {
        month,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        modelsUsed: [],
        modelBreakdowns: []
      });
    }
    
    const monthData = monthly.get(month)!;
    monthData.inputTokens += entry.inputTokens;
    monthData.outputTokens += entry.outputTokens;
    monthData.totalCost += entry.costUSD;
    
    if (!monthData.modelsUsed.includes(entry.model)) {
      monthData.modelsUsed.push(entry.model);
    }
    
    // Update model breakdown
    let modelBreakdown = monthData.modelBreakdowns.find(m => m.model === entry.model);
    if (!modelBreakdown) {
      modelBreakdown = {
        model: entry.model,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0
      };
      monthData.modelBreakdowns.push(modelBreakdown);
    }
    
    modelBreakdown.inputTokens += entry.inputTokens;
    modelBreakdown.outputTokens += entry.outputTokens;
    modelBreakdown.totalCost += entry.costUSD;
  }
  
  return Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function displayMonthlyTable(monthlyData: MonthlyUsage[]) {
  console.log(chalk.bold.magenta('\n╔══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║                          📈 MONTHLY USAGE REPORT                              ║'));
  console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════════════════════════════╝\n'));

  const table = new Table({
    head: [
      chalk.bold.white('Month'),
      chalk.bold.white('Input'),
      chalk.bold.white('Output'),
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
    colWidths: [12, 12, 12, 12, 14, 25]
  });
  
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  
  for (const month of monthlyData) {
    totalInput += month.inputTokens;
    totalOutput += month.outputTokens;
    totalCost += month.totalCost;
    
    const totalTokens = month.inputTokens + month.outputTokens;
    table.push([
      chalk.cyan(month.month),
      formatNumber(month.inputTokens),
      formatNumber(month.outputTokens),
      chalk.bold(formatNumber(totalTokens)),
      formatCost(month.totalCost),
      month.modelsUsed.map(m => getModelColor(m)).join(', ')
    ]);
  }
  
  // Add totals row
  table.push([
    chalk.bold('TOTAL'),
    chalk.bold(totalInput.toLocaleString()),
    chalk.bold(totalOutput.toLocaleString()),
    chalk.bold.green(`$${totalCost.toFixed(2)}`),
    ''
  ]);
  
  console.log(table.toString());
  
  // Show model breakdown for each month
  for (const month of monthlyData) {
    if (month.modelBreakdowns.length > 1) {
      console.log(chalk.bold(`\n📈 ${month.month} Model Breakdown:`));
      const modelTable = new Table({
        head: [
          chalk.gray('Model'),
          chalk.gray('Input'),
          chalk.gray('Output'),
          chalk.gray('Cost')
        ],
        style: { head: [], border: [] }
      });
      
      for (const model of month.modelBreakdowns) {
        modelTable.push([
          getModelColor(model.model),
          formatNumber(model.inputTokens),
          formatNumber(model.outputTokens),
          formatCost(model.totalCost)
        ]);
      }
      
      console.log(modelTable.toString());
    }
  }
}