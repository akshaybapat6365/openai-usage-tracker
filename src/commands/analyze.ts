import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { CODEX_DIR, PRICING } from '../constants.js';
import type { UsageEntry } from '../types.js';

interface ModelPattern {
  hasReasoning: boolean;
  messageLength: number;
  responseTime?: number;
  hasTools?: boolean;
  complexity: 'low' | 'medium' | 'high' | 'extreme';
}

export function analyzeModelPatterns() {
  const sessionsDir = join(CODEX_DIR, 'sessions');
  
  console.log(chalk.bold.cyan('\n🔬 Advanced Model Detection Analysis\n'));
  console.log(chalk.gray('Analyzing session patterns to determine actual models used...\n'));
  
  const modelUsage = new Map<string, number>();
  const modelCosts = new Map<string, number>();
  let totalSessions = 0;
  let totalMessages = 0;
  
  // Analyze all session files
  const findFiles = (dir: string): string[] => {
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    const items = readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...findFiles(fullPath));
      } else if (item.name.endsWith('.json') || item.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
    return files;
  };
  
  const sessionFiles = findFiles(sessionsDir);
  console.log(chalk.gray(`Found ${sessionFiles.length} session files to analyze\n`));
  
  for (const file of sessionFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      totalSessions++;
      
      if (file.endsWith('.jsonl')) {
        // JSONL format (2025+)
        const lines = content.trim().split('\n');
        let hasReasoning = false;
        let messageCount = 0;
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'reasoning') hasReasoning = true;
            if (entry.type === 'message' && entry.role === 'assistant') {
              messageCount++;
              totalMessages++;
            }
          } catch {}
        }
        
        // Determine model based on patterns
        const model = hasReasoning ? 'o3' : 'gpt-4';
        modelUsage.set(model, (modelUsage.get(model) || 0) + messageCount);
        
      } else {
        // JSON format (legacy)
        const session = JSON.parse(content);
        if (!session.items) continue;
        
        let currentModel = 'gpt-4';
        let hasReasoning = false;
        
        // Check for model switches
        for (const item of session.items) {
          if (item.type === 'reasoning') {
            hasReasoning = true;
          }
          
          if (item.type === 'message' && item.role === 'system' && item.content?.[0]?.text) {
            const text = item.content[0].text;
            if (text.includes('Switched model to')) {
              const match = text.match(/Switched model to (.+)/);
              if (match) {
                currentModel = normalizeModelName(match[1]);
              }
            }
          }
        }
        
        // Analyze message patterns
        const assistantMessages = session.items.filter((i: any) => 
          i.type === 'message' && i.role === 'assistant'
        );
        
        for (const msg of assistantMessages) {
          totalMessages++;
          const pattern = analyzeMessagePattern(msg, hasReasoning);
          const detectedModel = inferModelFromPattern(pattern, currentModel);
          
          modelUsage.set(detectedModel, (modelUsage.get(detectedModel) || 0) + 1);
          
          // Calculate cost
          const text = extractText(msg.content);
          const tokens = estimateTokens(text);
          const cost = calculateModelCost(detectedModel, tokens.input, tokens.output);
          modelCosts.set(detectedModel, (modelCosts.get(detectedModel) || 0) + cost);
        }
      }
    } catch (e) {
      // Skip malformed files
    }
  }
  
  // Display results
  console.log(chalk.bold.yellow('═══════════════════════════════════════════════════════════════\n'));
  console.log(chalk.bold.cyan('📊 Model Usage Distribution\n'));
  
  const sortedModels = Array.from(modelUsage.entries())
    .sort((a, b) => b[1] - a[1]);
  
  let totalUsage = 0;
  for (const [_, count] of sortedModels) {
    totalUsage += count;
  }
  
  for (const [model, count] of sortedModels) {
    const percentage = ((count / totalUsage) * 100).toFixed(1);
    const cost = modelCosts.get(model) || 0;
    const bar = '█'.repeat(Math.round(parseFloat(percentage) / 2));
    
    console.log(
      chalk.bold(getModelDisplay(model).padEnd(15)) +
      chalk.gray(bar.padEnd(50)) +
      chalk.yellow(`${percentage}%`.padStart(6)) +
      chalk.gray(` (${count} uses)`.padEnd(15)) +
      chalk.green(`$${cost.toFixed(2)}`)
    );
  }
  
  console.log(chalk.bold.yellow('\n═══════════════════════════════════════════════════════════════\n'));
  
  // Summary stats
  console.log(chalk.bold.cyan('📈 Summary Statistics\n'));
  console.log(chalk.gray(`  • Total Sessions: ${totalSessions}`));
  console.log(chalk.gray(`  • Total Messages: ${totalMessages}`));
  console.log(chalk.gray(`  • Unique Models: ${modelUsage.size}`));
  console.log(chalk.gray(`  • Total Cost: ${chalk.green(`$${Array.from(modelCosts.values()).reduce((a, b) => a + b, 0).toFixed(2)}`)}`));
  
  // Model capabilities
  console.log(chalk.bold.cyan('\n🚀 Detected Model Capabilities\n'));
  
  const capabilities = {
    'o3': 'Advanced reasoning with chain-of-thought',
    'o3-pro': 'Professional reasoning, extended context',
    'o3-mini': 'Efficient reasoning for simpler tasks', 
    'gpt-5': 'Latest flagship, multimodal capabilities',
    'gpt-4.5': 'Enhanced GPT-4 with better performance',
    'gpt-4': 'Standard high-capability model',
    'o4-mini': 'Next-gen efficient model',
    'model-max': 'Maximum capability, highest cost'
  };
  
  for (const [model] of sortedModels) {
    if (capabilities[model as keyof typeof capabilities]) {
      console.log(
        chalk.bold(`  ${getModelDisplay(model)}:`.padEnd(15)) +
        chalk.gray(capabilities[model as keyof typeof capabilities])
      );
    }
  }
}

function analyzeMessagePattern(message: any, hasReasoning: boolean): ModelPattern {
  const text = extractText(message.content);
  const length = text.length;
  
  // Determine complexity based on content
  let complexity: ModelPattern['complexity'] = 'medium';
  if (length > 5000) complexity = 'high';
  if (length > 10000) complexity = 'extreme';
  if (length < 500) complexity = 'low';
  
  return {
    hasReasoning,
    messageLength: length,
    complexity
  };
}

function inferModelFromPattern(pattern: ModelPattern, defaultModel: string): string {
  // If we have reasoning, it's likely an o1/o3 model
  if (pattern.hasReasoning) {
    if (pattern.complexity === 'extreme') return 'o3-pro';
    if (pattern.complexity === 'high') return 'o3';
    return 'o3-mini';
  }
  
  // For non-reasoning models, use default or infer from complexity
  if (pattern.complexity === 'extreme' && defaultModel === 'gpt-4') {
    return 'gpt-5'; // Assume newest model for extreme complexity
  }
  
  return defaultModel;
}

function extractText(content: any): string {
  if (!content) return '';
  if (Array.isArray(content)) {
    return content.map((c: any) => c.text || c.output_text || '').join(' ');
  }
  if (typeof content === 'string') return content;
  return JSON.stringify(content);
}

function estimateTokens(text: string): { input: number; output: number } {
  const tokens = Math.ceil(text.length / 4);
  return {
    input: Math.ceil(tokens * 0.2), // Assume 20% input
    output: Math.ceil(tokens * 0.8)  // 80% output
  };
}

function calculateModelCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4'];
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

function normalizeModelName(modelStr: string): string {
  const lower = modelStr.toLowerCase();
  
  if (lower.includes('o3-pro')) return 'o3-pro';
  if (lower.includes('o3-mini')) return 'o3-mini';
  if (lower.includes('o3')) return 'o3';
  if (lower.includes('o4-mini')) return 'o4-mini';
  if (lower.includes('o4')) return 'o4';
  if (lower.includes('gpt-5')) return 'gpt-5';
  if (lower.includes('gpt-4.5')) return 'gpt-4.5';
  if (lower.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (lower.includes('gpt-4o')) return 'gpt-4o';
  if (lower.includes('gpt-4-turbo')) return 'gpt-4-turbo';
  if (lower.includes('gpt-4')) return 'gpt-4';
  if (lower.includes('model-max')) return 'model-max';
  
  return 'gpt-4';
}

function getModelDisplay(model: string): string {
  const displays: Record<string, string> = {
    'o3-pro': '🏆 o3-pro',
    'o3': '🧠 o3',
    'o3-mini': '⚡ o3-mini',
    'gpt-5': '🚀 GPT-5',
    'gpt-4.5': '✨ GPT-4.5',
    'gpt-4': '💎 GPT-4',
    'o4-mini': '🎯 o4-mini',
    'o4': '🔥 o4',
    'model-max': '👑 MODEL-MAX'
  };
  
  return displays[model] || model;
}