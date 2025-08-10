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
  
  // GPT-5 and 4.5 (newest)
  if (modelLower.includes('gpt-5')) return chalk.bold.red('GPT-5');
  if (modelLower.includes('gpt-4.5')) return chalk.bold.hex('#FF6B6B')('GPT-4.5');
  
  // O3 reasoning models (chain-of-thought)
  if (modelLower.includes('o3-pro')) return chalk.bold.hex('#FFD700')('o3-pro');
  if (modelLower.includes('o3-mini')) return chalk.hex('#FFA500')('o3-mini');
  if (modelLower.includes('o3')) return chalk.bold.yellow('o3');
  
  // O4 models
  if (modelLower.includes('o4-mini')) return chalk.green('o4-mini');
  if (modelLower.includes('o4')) return chalk.bold.green('o4');
  
  // O1 models
  if (modelLower.includes('o1-preview')) return chalk.hex('#9B59B6')('o1-preview');
  if (modelLower.includes('o1-mini')) return chalk.hex('#8E44AD')('o1-mini');
  
  // GPT-4o family
  if (modelLower.includes('gpt-4o-mini')) return chalk.cyan('GPT-4o-mini');
  if (modelLower.includes('gpt-4o')) return chalk.blue('GPT-4o');
  
  // GPT-4 family
  if (modelLower.includes('gpt-4-turbo')) return chalk.magenta('GPT-4-Turbo');
  if (modelLower.includes('gpt-4')) return chalk.bold.magenta('GPT-4');
  
  // Special models
  if (modelLower.includes('model-max')) return chalk.bold.hex('#FF1493')('MODEL-MAX');
  
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