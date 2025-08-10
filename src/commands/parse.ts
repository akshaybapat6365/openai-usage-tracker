import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { CODEX_DIR, CODEX_USAGE_DIR, USAGE_DATA_FILE, PRICING } from '../constants.js';
import type { UsageEntry } from '../types.js';

interface ParseOptions {
  estimate?: boolean;
}

export function parseCodexSessions(options: ParseOptions) {
  const sessionsDir = join(CODEX_DIR, 'sessions');
  
  if (!existsSync(sessionsDir)) {
    console.error(chalk.red('Codex sessions directory not found at: ' + sessionsDir));
    console.log(chalk.yellow('Make sure Codex is installed and has been used.'));
    process.exit(1);
  }
  
  console.log(chalk.cyan('🔍 Analyzing Codex session files...'));
  console.log(chalk.gray('Supporting both JSON (legacy) and JSONL (2025+) formats'));

  // Ensure usage directory exists
  if (!existsSync(CODEX_USAGE_DIR)) {
    mkdirSync(CODEX_USAGE_DIR, { recursive: true });
  }

  console.log(chalk.green('🔍 Parsing Codex session files...'));
  
  // Find both JSON and JSONL files recursively
  const findFiles = (dir: string): string[] => {
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
  
  console.log(chalk.gray(`Found ${sessionFiles.length} session files`));
  
  const entries: UsageEntry[] = [];
  let processedCount = 0;
  
  for (const file of sessionFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      
      // Handle JSONL format (2025+)
      if (file.endsWith('.jsonl')) {
        const lines = content.trim().split('\n');
        let currentModel = 'gpt-4'; // default
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const entry = JSON.parse(line);
            
            // Track model from reasoning entries
            if (entry.type === 'reasoning' && entry.id) {
              // Extract model from reasoning ID pattern if available
              const modelMatch = entry.id.match(/rs_[a-f0-9]+/);
              if (modelMatch) {
                // Use o3 for reasoning models by default
                currentModel = 'o3';
              }
            }
            
            // Process assistant messages
            if (entry.type === 'message' && entry.role === 'assistant' && entry.content) {
              const timestamp = new Date().toISOString();
              const text = extractText(entry.content);
              const outputTokens = estimateTokenCount(text);
              
              // Look for previous user message for input tokens
              const inputTokens = 100; // Default estimate
              
              const usageEntry: UsageEntry = {
                timestamp,
                sessionId: file.split('/').pop()?.replace('.jsonl', '') || 'unknown',
                model: currentModel,
                inputTokens,
                outputTokens,
                costUSD: calculateCost(currentModel, inputTokens, outputTokens),
              };
              
              entries.push(usageEntry);
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
        processedCount++;
        continue;
      }
      
      // Handle JSON format (legacy)
      const session = JSON.parse(content);
      
      if (session.items && Array.isArray(session.items)) {
        for (const item of session.items) {
          // Look for assistant messages (responses)
          if (item.role === 'assistant' && item.content) {
            const timestamp = session.session?.timestamp || new Date().toISOString();
            const sessionId = session.session?.id || 'unknown';
            
            // Estimate tokens based on content length
            const text = extractText(item.content);
            const estimatedTokens = estimateTokenCount(text);
            
            // Try to detect model from system messages
            let model = 'gpt-4'; // default
            const switchMsg = session.items.find((i: any) => 
              i.type === 'message' && 
              i.role === 'system' && 
              i.content?.[0]?.text?.includes('Switched model to')
            );
            
            if (switchMsg) {
              const modelMatch = switchMsg.content[0].text.match(/Switched model to (.+)/);
              if (modelMatch) {
                model = normalizeModelName(modelMatch[1]);
              }
            }
            
            // Check for reasoning entries (indicates o3 usage)
            const hasReasoning = session.items.some((i: any) => i.type === 'reasoning');
            if (hasReasoning && model === 'gpt-4') {
              model = 'o3'; // Reasoning indicates o3 model
            }
            
            // Also count user message tokens
            const userMsg = findPreviousUserMessage(session.items, session.items.indexOf(item));
            const userTokens = userMsg ? estimateTokenCount(extractText(userMsg.content)) : 100;
            
            const entry: UsageEntry = {
              timestamp,
              sessionId,
              model,
              inputTokens: userTokens,
              outputTokens: estimatedTokens,
              costUSD: calculateCost(model, userTokens, estimatedTokens),
            };
            
            entries.push(entry);
          }
        }
        processedCount++;
      }
    } catch (error) {
      console.error(chalk.yellow(`Warning: Could not parse ${file}`));
    }
  }
  
  // Save parsed data
  const existingData = existsSync(USAGE_DATA_FILE) 
    ? readFileSync(USAGE_DATA_FILE, 'utf-8') 
    : '';
  
  const newData = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  writeFileSync(USAGE_DATA_FILE, existingData + newData);
  
  console.log(chalk.green(`\n✅ Parsed ${processedCount} session files`));
  console.log(chalk.green(`📊 Found ${entries.length} API interactions`));
  
  // Calculate total cost
  const totalCost = entries.reduce((sum, e) => sum + e.costUSD, 0);
  console.log(chalk.yellow(`💰 Estimated total cost: $${totalCost.toFixed(4)}`));
  
  if (options.estimate) {
    console.log(chalk.gray('\nNote: Token counts are estimated based on text length.'));
    console.log(chalk.gray('Actual usage may vary by ~20%'));
  }
}

function extractText(content: any): string {
  if (!content) return '';
  
  if (Array.isArray(content)) {
    return content
      .map((c: any) => c.text || c.input_text || c.output_text || '')
      .join(' ');
  }
  
  if (typeof content === 'string') return content;
  
  return JSON.stringify(content);
}

function estimateTokenCount(text: string): number {
  // More accurate GPT token estimation
  // Based on OpenAI's guidelines:
  // - 1 token ≈ 4 chars in English
  // - 1 token ≈ 0.75 words
  // - Accounting for whitespace and punctuation
  
  if (!text || text.length === 0) return 0;
  
  // Count words for better estimation
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  
  // Use a weighted average of both methods
  const byWords = Math.ceil(words / 0.75);
  const byChars = Math.ceil(chars / 4);
  
  // GPT models typically use more tokens for code/technical content
  // Average the two methods with slight bias toward character count
  return Math.ceil((byWords * 0.4 + byChars * 0.6));
}

function findPreviousUserMessage(items: any[], currentIndex: number): any {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (items[i].role === 'user') {
      return items[i];
    }
  }
  return null;
}

function normalizeModelName(modelStr: string): string {
  const lower = modelStr.toLowerCase();
  
  // O3 models (reasoning with chain-of-thought)
  if (lower.includes('o3-pro')) return 'o3-pro';
  if (lower.includes('o3-mini')) return 'o3-mini';
  if (lower.includes('o3')) return 'o3';
  
  // O4 models
  if (lower.includes('o4-mini')) return 'o4-mini';
  if (lower.includes('o4')) return 'o4';
  
  // O1 models
  if (lower.includes('o1-preview')) return 'o1-preview';
  if (lower.includes('o1-mini')) return 'o1-mini';
  
  // GPT-5 and GPT-4.5
  if (lower.includes('gpt-5')) return 'gpt-5';
  if (lower.includes('gpt-4.5')) return 'gpt-4.5';
  
  // GPT-4o family
  if (lower.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (lower.includes('gpt-4o')) return 'gpt-4o';
  
  // GPT-4 family
  if (lower.includes('gpt-4-turbo')) return 'gpt-4-turbo';
  if (lower.includes('gpt-4')) return 'gpt-4';
  
  // Special models
  if (lower.includes('model-max')) return 'model-max';
  
  return 'gpt-4'; // default
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}