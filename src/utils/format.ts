import chalk from 'chalk';

export function formatNumber(num: number): string {
  if (num === 0) return chalk.dim('0');
  if (num < 1000) return String(num);
  if (num < 1000000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return `${(num / 1000000).toFixed(2)}M`;
}

export function formatCost(cost: number): string {
  if (cost === 0) return chalk.dim('$0.00');
  if (cost < 0.01) return chalk.yellow(`$${cost.toFixed(4)}`);
  if (cost < 1) return chalk.yellow(`$${cost.toFixed(3)}`);
  if (cost < 10) return chalk.hex('#FFA500')(`$${cost.toFixed(2)}`);
  if (cost < 100) return chalk.red(`$${cost.toFixed(2)}`);
  return chalk.bold.red(`$${cost.toFixed(2)}`);
}

export function getModelColor(model: string): string {
  const modelLower = model.toLowerCase();
  
  if (modelLower.includes('gpt-4o-mini')) return chalk.cyan('GPT-4o-mini');
  if (modelLower.includes('gpt-4o')) return chalk.blue('GPT-4o');
  if (modelLower.includes('gpt-4-turbo')) return chalk.magenta('GPT-4-Turbo');
  if (modelLower.includes('gpt-4')) return chalk.bold.magenta('GPT-4');
  if (modelLower.includes('o1-preview')) return chalk.bold.yellow('o1-preview');
  if (modelLower.includes('o1-mini')) return chalk.yellow('o1-mini');
  if (modelLower.includes('o4-mini')) return chalk.green('o4-mini');
  
  return chalk.gray(model);
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const month = d.toLocaleDateString('en', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatDateTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleString('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}