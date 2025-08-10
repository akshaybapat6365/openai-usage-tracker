import { readFileSync, existsSync } from 'fs';
import Table from 'cli-table3';
import chalk from 'chalk';
import { USAGE_DATA_FILE } from '../constants.js';
import type { UsageEntry, SessionUsage } from '../types.js';

interface SessionOptions {
  json?: boolean;
}

export function showSession(options: SessionOptions) {
  if (!existsSync(USAGE_DATA_FILE)) {
    console.error(chalk.red('No usage data found. Run "codex-usage track" first.'));
    process.exit(1);
  }

  const entries = loadUsageData();
  const sessionData = aggregateSessionUsage(entries);

  if (options.json) {
    console.log(JSON.stringify(sessionData, null, 2));
  } else {
    displaySessionTable(sessionData);
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

function aggregateSessionUsage(entries: UsageEntry[]): SessionUsage[] {
  const sessions = new Map<string, SessionUsage>();
  
  // Group by hour blocks as pseudo-sessions if no sessionId
  for (const entry of entries) {
    // Create session ID based on hour block
    const timestamp = new Date(entry.timestamp);
    const sessionId = entry.sessionId || 
      `session-${timestamp.toISOString().substring(0, 13)}`; // Group by hour
    
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        sessionId,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        lastActivity: entry.timestamp,
        modelsUsed: [],
        modelBreakdowns: []
      });
    }
    
    const session = sessions.get(sessionId)!;
    session.inputTokens += entry.inputTokens;
    session.outputTokens += entry.outputTokens;
    session.totalCost += entry.costUSD;
    
    // Update last activity
    if (entry.timestamp > session.lastActivity) {
      session.lastActivity = entry.timestamp;
    }
    
    if (!session.modelsUsed.includes(entry.model)) {
      session.modelsUsed.push(entry.model);
    }
    
    // Update model breakdown
    let modelBreakdown = session.modelBreakdowns.find(m => m.model === entry.model);
    if (!modelBreakdown) {
      modelBreakdown = {
        model: entry.model,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0
      };
      session.modelBreakdowns.push(modelBreakdown);
    }
    
    modelBreakdown.inputTokens += entry.inputTokens;
    modelBreakdown.outputTokens += entry.outputTokens;
    modelBreakdown.totalCost += entry.costUSD;
  }
  
  return Array.from(sessions.values()).sort((a, b) => 
    b.lastActivity.localeCompare(a.lastActivity) // Most recent first
  );
}

function displaySessionTable(sessionData: SessionUsage[]) {
  const table = new Table({
    head: [
      chalk.cyan('Session'),
      chalk.cyan('Last Activity'),
      chalk.cyan('Input'),
      chalk.cyan('Output'),
      chalk.cyan('Cost'),
      chalk.cyan('Models')
    ],
    style: { head: [], border: [] },
    colWidths: [20, 20, 12, 12, 10, 20]
  });
  
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  
  for (const session of sessionData) {
    totalInput += session.inputTokens;
    totalOutput += session.outputTokens;
    totalCost += session.totalCost;
    
    const sessionIdShort = session.sessionId.length > 18 
      ? session.sessionId.substring(0, 18) + '...'
      : session.sessionId;
    
    const lastActivity = new Date(session.lastActivity);
    const formattedDate = lastActivity.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    table.push([
      sessionIdShort,
      formattedDate,
      session.inputTokens.toLocaleString(),
      session.outputTokens.toLocaleString(),
      chalk.green(`$${session.totalCost.toFixed(3)}`),
      session.modelsUsed.join(', ')
    ]);
  }
  
  // Add totals row
  table.push([
    chalk.bold('TOTAL'),
    '',
    chalk.bold(totalInput.toLocaleString()),
    chalk.bold(totalOutput.toLocaleString()),
    chalk.bold.green(`$${totalCost.toFixed(2)}`),
    ''
  ]);
  
  console.log(chalk.bold('\n📊 Session Usage Report\n'));
  console.log(table.toString());
  console.log(chalk.gray(`\nTotal sessions: ${sessionData.length}`));
}