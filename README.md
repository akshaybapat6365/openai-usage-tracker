# 🚀 OpenAI Usage Tracker

Track and analyze OpenAI Codex CLI usage and costs, similar to [ccusage](https://github.com/ryoppippi/ccusage) for Claude Code.

## Features

- 📊 **Daily Reports**: View token usage and costs aggregated by date
- 📈 **Monthly Reports**: Track monthly spending and usage patterns  
- 💬 **Session Reports**: Analyze usage grouped by sessions
- 💰 **Cost Calculation**: Automatic cost calculation based on OpenAI pricing
- 🔍 **Parse Existing Data**: Extract usage from existing Codex session files

## Installation

### From GitHub
```bash
# Clone the repository
git clone https://github.com/akshaybapat6365/openai-usage-tracker.git
cd openai-usage-tracker

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm link

# Now you can use 'cxu' or 'codex-usage' commands globally
```

## Usage

### Parse Existing Codex Sessions

Since Codex uses ChatGPT authentication (not API keys), the tool can parse your existing session files:

```bash
# Parse all Codex session files in ~/.codex/sessions/
cxu parse --estimate
# OR if not installed globally:
node dist/index.js parse --estimate

# This will extract usage data and save it to ~/.codex-usage/usage.jsonl
```

### View Reports

```bash
# Daily usage report
cxu daily
cxu daily --from 2025-01-01 --to 2025-01-31
cxu daily --json  # JSON output

# Monthly usage report  
cxu monthly
cxu monthly --month 2025-01
cxu monthly --json

# Session-based report
cxu session
cxu session --json
```

## How It Works

### Parsing Codex Sessions

The tool analyzes session files in `~/.codex/sessions/` to:
1. Extract conversation history
2. Estimate token counts based on message content
3. Detect model changes from system messages
4. Calculate costs using OpenAI pricing

### Token Estimation

Since Codex doesn't store exact token counts, the tool estimates:
- **Input tokens**: From user messages
- **Output tokens**: From assistant responses  
- **Rough estimate**: 1 token ≈ 4 characters

⚠️ **Note**: Actual token usage may vary by ~20% from estimates

### Supported Models & Pricing

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| GPT-4 | $0.03 | $0.06 |
| GPT-4 Turbo | $0.01 | $0.03 |
| GPT-4o | $0.005 | $0.015 |
| GPT-4o mini | $0.00015 | $0.0006 |
| o1-preview | $0.015 | $0.06 |
| o1-mini | $0.003 | $0.012 |

## Limitations

1. **No Real-time Tracking**: Unlike Claude Code, Codex doesn't expose token usage in logs
2. **Token Estimation**: Token counts are estimated, not exact
3. **ChatGPT Auth**: Cannot intercept API calls when using ChatGPT account authentication
4. **Session-based**: Only works with saved session files

## Alternative: Direct API Tracking

If you use OpenAI API directly (not through Codex CLI), you can track real-time usage with the API key approach. However, this is not applicable for the Codex CLI tool which uses ChatGPT authentication.

## Beautiful Output Example

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📊 DAILY USAGE REPORT                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

╔════════════╤════════════╤════════════╤══════════╤════════════╤════════════╤════════════════════╗
║ Date       │ Input      │ Output     │ Cache    │ Total      │ Cost (USD) │ Models             ║
╟────────────┼────────────┼────────────┼──────────┼────────────┼────────────┼────────────────────╢
║ 2025-04-20 │ 305        │ 8.0K       │ 0        │ 8.3K       │ $0.491     │ GPT-4              ║
╟────────────┼────────────┼────────────┼──────────┼────────────┼────────────┼────────────────────╢
║ 2025-04-21 │ 220.8K     │ 1.18M      │ 0        │ 1.40M      │ $77.67     │ GPT-4              ║
╚════════════╧════════════╧════════════╧══════════╧════════════╧════════════╧════════════════════╝
```

## Repository

🔗 [GitHub: openai-usage-tracker](https://github.com/akshaybapat6365/openai-usage-tracker)

## License

MIT