# NVIDIA Kumo Setup Guide

This guide explains how to integrate Kumo ML predictions into the Tucarroplus CRM.

## What is Kumo?

**Kumo** is NVIDIA's relational machine learning model for tabular data with multiple related tables. In our case:
- **Instance table**: Leads (who converted or not)
- **Related tables**: Interactions, Vehicles viewed, Lead context
- **Task**: Binary classification (will this lead convert? Yes/No)

## Prerequisites

1. ✅ **NVIDIA API Key**: Valid for 90 days (stored in Claude memory)
2. ✅ **Historical data**: 50+ leads with known outcomes (vendido/perdido)
3. ✅ **Node.js**: v16+ installed locally

## Step 1: Get Your API Key

The GitHub Personal Access Token (for repo management) and the NVIDIA Kumo API key are stored securely:

```bash
# Ask Claude to provide from memory:
# Token: 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
# Expires: Wed, Dec 15, 2026 (90 days)
```

## Step 2: Configure .env

```bash
cp .env.example .env
```

Edit `.env`:

```env
NVIDIA_API_KEY=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
NVIDIA_API_URL=https://ai.api.nvidia.com/v1/structured-data/nvidia/kumo-relational/predictions
```

## Step 3: Export Training Data

Extract historical leads from Firestore and transform to Kumo format:

```bash
npm run export
# Generates: ml/data/training-data.json
```

The export includes:
- **Lead IDs, creation dates, outcomes** (vendido=1, perdido=0)
- **Interactions**: Status changes over time
- **Vehicles**: Models researched
- **Context**: Source, campaign, vendor

## Step 4: Train Model

Transform data to Kumo schema and upload:

```bash
npm run kumo:train
# 1. Reads ml/data/training-data.json
# 2. Transforms to Kumo schema (ml/kumo-schema.json)
# 3. Uploads to NVIDIA Kumo API
# 4. Prints accuracy metrics
```

Expected output:

```
Training Data Transformation Complete
✓ Instance table (leads): 127 records
✓ Related table (interactions): 412 records
✓ Related table (vehicles_viewed): 284 records
✓ Related table (lead_context): 127 records

Uploading to NVIDIA Kumo API...
✓ Model trained successfully

Metrics:
- Accuracy: 0.82 (82%)
- Precision: 0.79 (79% of predicted "vendido" were correct)
- Recall: 0.85 (85% of actual "vendido" were caught)
- ROC-AUC: 0.88
```

## Step 5: Make Predictions

Score individual leads (for real-time predictions):

```bash
npm run kumo:predict --lead-id "abc123"
# Output:
# {
#   "prediction": "vendido",
#   "probability": 0.78,
#   "confidence": "high"
# }
```

Or batch score all leads:

```javascript
const kumo = require('./ml/predictions.js');

const leads = [
  { lead_id: 'abc123', /* ... */ },
  { lead_id: 'xyz789', /* ... */ }
];

const scores = await kumo.predictBatch(leads);
// { abc123: 0.78, xyz789: 0.42, ... }
```

## Integration with CRM UI

### Real-time Scoring

When a new lead is added:

```javascript
// src/hooks/useKumoPredict.js
export function useKumoPredict(lead) {
  const [score, setScore] = useState(null);
  
  useEffect(() => {
    if (lead.id) {
      kumo.predict(lead.id).then(({ probability }) => {
        setScore(probability);
        // Update Firestore
        db.collection('leads').doc(lead.id).update({
          conversionProbability: probability,
          kumoScoreUpdated: new Date().toISOString()
        });
      });
    }
  }, [lead.id]);
  
  return score;
}
```

### Display in Cards

```html
<!-- public/index.html -->
<div class="card">
  <div class="name">Carlos Medina</div>
  <div class="vehicle">2025 Toyota RAV4</div>
  
  <!-- Kumo score as a progress bar -->
  <div class="kumo-score">
    <label>Conversion Probability</label>
    <div class="progress-bar">
      <span style="width: 78%">78%</span>
    </div>
  </div>
  
  <!-- Color-coded badge -->
  <span class="confidence-badge high">High probability</span>
</div>
```

## n8n Workflow: Auto-Score on Lead Add

1. **Trigger**: New record in Firestore → leads
2. **Execute**: Call Kumo API with lead data
3. **Update**: Write `conversionProbability` back to Firestore
4. **Notify**: If score > 0.75, send Slack alert to Miguel

```json
{
  "nodes": [
    {
      "name": "Firestore Trigger",
      "type": "n8n-nodes-base:firestore",
      "operation": "watch",
      "collection": "leads"
    },
    {
      "name": "Kumo Predict",
      "type": "n8n-nodes-base:httpRequest",
      "url": "https://ai.api.nvidia.com/v1/structured-data/nvidia/kumo-relational/predictions",
      "headers": {
        "Authorization": "Bearer {{ $env.NVIDIA_API_KEY }}"
      }
    },
    {
      "name": "Update Lead Score",
      "type": "n8n-nodes-base:firestore",
      "operation": "update",
      "data": {
        "conversionProbability": "{{ $node.Kumo.json.probabilities.true }}"
      }
    }
  ]
}
```

## Troubleshooting

### Error: "Invalid API key"

```bash
# Check .env
echo $NVIDIA_API_KEY
# Should start with "nvapi-"

# If empty, ask Claude to provide from memory
```

### Error: "Not enough training data"

```bash
# Need at least 50 leads with outcomes
db.collection('leads')
  .where('status', 'in', ['vendido', 'perdido'])
  .get()
  .then(snap => console.log(snap.size + ' leads'))
```

### Model accuracy is low (< 0.70)

1. **Add more data**: Collect 200+ leads
2. **Check data quality**: Verify phone, vehicle, source are filled
3. **Feature engineering**: Add more columns (location, price range, etc.)

## Best Practices

✅ **Retrain monthly** with new lead outcomes  
✅ **Monitor prediction accuracy** — compare predicted vs. actual conversions  
✅ **Segment by source** — FB ads leads behave differently than referrals  
✅ **Use probabilities strategically** — high-score leads get priority follow-up  
✅ **Keep API key safe** — never commit to GitHub, rotate every 90 days

## Security & Rotation

**Current API key expires**: December 15, 2026

To renew:
1. Create new token in GitHub (Settings → Developer Settings → Personal Tokens)
2. Update in Claude memory (with 90-day expiration)
3. Update `.env` in GitHub (encrypted via GitHub Secrets)
4. Notify team

## References

- [NVIDIA Kumo Docs](https://docs.nvidia.com/generative-ai/kumo)
- [Kumo Schema Spec](../ml/kumo-schema.json)
- [API Examples](../ml/predictions.js)

---

**Last Updated**: September 16, 2026  
**Status**: Ready for production  
**Questions**: Contact Miguel (@vcall405)
