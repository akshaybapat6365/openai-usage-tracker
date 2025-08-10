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

  // Ensure usage directory exists
  if (!existsSync(CODEX_USAGE_DIR)) {
    mkdirSync(CODEX_USAGE_DIR, { recursive: true });
  }

  console.log(chalk.green('🔍 Parsing Codex session files...'));
  
  const sessionFiles = readdirSync(sessionsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => join(sessionsDir, f));
  
  console.log(chalk.gray(`Found ${sessionFiles.length} session files`));
  
  const entries: UsageEntry[] = [];
  let processedCount = 0;
  
  for (const file of sessionFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
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
  
  if (lower.includes('o1-preview')) return 'o1-preview';
  if (lower.includes('o1-mini')) return 'o1-mini';
  if (lower.includes('o4-mini')) return 'o4-mini';
  if (lower.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (lower.includes('gpt-4o')) return 'gpt-4o';
  if (lower.includes('gpt-4-turbo')) return 'gpt-4-turbo';
  if (lower.includes('gpt-4')) return 'gpt-4';
  
  return 'gpt-4'; // default
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}