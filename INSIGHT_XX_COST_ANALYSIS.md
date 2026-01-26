# Insight XX Cost Analysis - Per Analysis

## Current Setup (Insight XX)
- **Model**: `gemini-2.0-flash`
- **Max Output Tokens**: 4096
- **Temperature**: 0.3

## Token Estimation

### Input Tokens (Prompt Size)
Based on the code analysis:

1. **System Prompt**: ~400 tokens
   - INSTITUTIONAL_SYSTEM_PROMPT: ~200 tokens
   - Trading style context: ~100 tokens
   - Output format instructions: ~100 tokens

2. **Market Data Section**: ~800-1200 tokens
   - Symbol, timeframe, current price: ~20 tokens
   - Technical indicators (RSI, MACD, EMAs, ATR): ~50 tokens
   - Key levels (supports/resistances): ~50-100 tokens
   - **OHLC Data (50 candles)**: ~600-800 tokens
     - Each candle: ~12-15 tokens (O, H, L, C, timestamp)
     - 50 candles × 12 = ~600 tokens
   - **Higher Timeframe (20 candles)**: ~240-300 tokens
   - Higher TF indicators: ~50 tokens

3. **Total Estimated Input**: **~1,200-1,600 tokens per analysis**

### Output Tokens (Response Size)
- **Max Allowed**: 4096 tokens
- **Typical Actual**: ~2,000-3,000 tokens (based on JSON structure complexity)
- **Average Estimate**: **~2,500 tokens per analysis**

---

## Gemini Model Pricing (as of 2025)

### gemini-2.0-flash (Current - Insight XX)
- Input: **$0.075 per 1M tokens**
- Output: **$0.30 per 1M tokens**

### gemini-2.0-flash-lite (Alternative)
- Input: **$0.0375 per 1M tokens** (50% cheaper)
- Output: **$0.15 per 1M tokens** (50% cheaper)

### gemini-1.5-flash (Used in Journal XX)
- Input: **$0.075 per 1M tokens**
- Output: **$0.30 per 1M tokens**

### gemini-2.5-pro (Premium option)
- Input: **$1.25 per 1M tokens** (16.7x more expensive)
- Output: **$5.00 per 1M tokens** (16.7x more expensive)

---

## Cost Per Analysis Calculation

### Insight XX (gemini-2.0-flash) - CURRENT
```
Input Cost:  (1,400 tokens / 1,000,000) × $0.075  = $0.000105
Output Cost: (2,500 tokens / 1,000,000) × $0.30    = $0.00075
─────────────────────────────────────────────────────────────
Total Cost:                                        = $0.000855
                                                  ≈ $0.00086 per analysis
```

**Monthly Cost (100 analyses/day = 3,000/month):**
- 3,000 analyses × $0.00086 = **$2.58/month**

**Monthly Cost (1,000 analyses/day = 30,000/month):**
- 30,000 analyses × $0.00086 = **$25.80/month**

---

### gemini-2.0-flash-lite (Alternative - 50% Cheaper)
```
Input Cost:  (1,400 tokens / 1,000,000) × $0.0375 = $0.0000525
Output Cost: (2,500 tokens / 1,000,000) × $0.15    = $0.000375
─────────────────────────────────────────────────────────────
Total Cost:                                        = $0.0004275
                                                  ≈ $0.00043 per analysis
```

**Monthly Cost (100 analyses/day = 3,000/month):**
- 3,000 analyses × $0.00043 = **$1.29/month** (50% savings)

**Monthly Cost (1,000 analyses/day = 30,000/month):**
- 30,000 analyses × $0.00043 = **$12.90/month** (50% savings)

---

### gemini-1.5-flash (Same as Current)
```
Input Cost:  (1,400 tokens / 1,000,000) × $0.075  = $0.000105
Output Cost: (2,500 tokens / 1,000,000) × $0.30    = $0.00075
─────────────────────────────────────────────────────────────
Total Cost:                                        = $0.000855
                                                  ≈ $0.00086 per analysis
```

**Same cost as gemini-2.0-flash**

---

### gemini-2.5-pro (Premium - Higher Quality)
```
Input Cost:  (1,400 tokens / 1,000,000) × $1.25    = $0.00175
Output Cost: (2,500 tokens / 1,000,000) × $5.00   = $0.0125
─────────────────────────────────────────────────────────────
Total Cost:                                        = $0.01425
                                                  ≈ $0.0143 per analysis
```

**Monthly Cost (100 analyses/day = 3,000/month):**
- 3,000 analyses × $0.0143 = **$42.90/month** (16.7x more expensive)

**Monthly Cost (1,000 analyses/day = 30,000/month):**
- 30,000 analyses × $0.0143 = **$429/month** (16.7x more expensive)

---

## Cost Comparison Summary

| Model | Cost Per Analysis | 100/day (3K/month) | 1,000/day (30K/month) | Quality |
|-------|------------------|-------------------|----------------------|---------|
| **gemini-2.0-flash** (Current) | **$0.00086** | **$2.58** | **$25.80** | Good |
| **gemini-2.0-flash-lite** | **$0.00043** | **$1.29** | **$12.90** | Good (50% cheaper) |
| **gemini-1.5-flash** | **$0.00086** | **$2.58** | **$25.80** | Good |
| **gemini-2.5-pro** | **$0.0143** | **$42.90** | **$429** | Excellent (16.7x more) |

---

## Recommendations

### Option 1: Switch to gemini-2.0-flash-lite (50% Cost Savings)
- **Savings**: $0.00043 per analysis (50% reduction)
- **Quality**: Similar to current model
- **Best for**: High-volume usage, cost optimization

### Option 2: Keep gemini-2.0-flash (Current)
- **Cost**: $0.00086 per analysis
- **Quality**: Good balance
- **Best for**: Standard usage

### Option 3: Upgrade to gemini-2.5-pro (Higher Quality)
- **Cost**: $0.0143 per analysis (16.7x more)
- **Quality**: Best precision and analysis depth
- **Best for**: Premium users, critical analyses

---

## Cost Breakdown by Component

### Input Costs (per analysis)
- System prompt: ~$0.00003 (400 tokens)
- Market data: ~$0.000075 (1,000 tokens)
- **Total Input**: ~$0.000105

### Output Costs (per analysis)
- JSON response: ~$0.00075 (2,500 tokens)
- **Total Output**: ~$0.00075

**Input is ~14% of total cost, Output is ~86% of total cost**

---

## Notes

1. **Actual token usage may vary** based on:
   - Number of candles (currently 50 primary + 20 context)
   - Number of support/resistance levels identified
   - Complexity of market structure analysis

2. **Output tokens are the main cost driver** (86% of total cost)
   - Reducing `maxOutputTokens` from 4096 to 2048 could save ~20-30%
   - But may reduce analysis quality/completeness

3. **Volume discounts** may apply at higher usage tiers (check Google Cloud pricing)

4. **Free tier**: Google typically offers free tier with limited requests/month

---

## Conclusion

**Current Insight XX cost: ~$0.00086 per analysis**

- Very affordable for individual users
- At scale (1,000 analyses/day): ~$25.80/month
- Switching to flash-lite could save 50% ($12.90/month at scale)
- Pro model is 16.7x more expensive but offers better quality

**Recommendation**: Consider switching to `gemini-2.0-flash-lite` for 50% cost savings with similar quality.
