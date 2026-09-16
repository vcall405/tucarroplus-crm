<<<<<<< HEAD
# Tucarroplus CRM

AI-powered CRM for automotive dealerships in Puerto Rico + NVIDIA Kumo ML predictions for lead conversion forecasting.

**Status**: ✅ Production Ready (v1.0)  
**GitHub**: https://github.com/vcall405/tucarroplus-crm  
**Live Demo**: [Tablero Tucarroplus](https://claude.ai/code/artifact/e42aef0f-d956-41c9-9b4f-8a4509a9052b)

## Features

- 📊 **Kanban Board**: Lead pipeline (Nuevo → Contactado → Cita → Negociando → Vendido/Perdido)
- 📞 **Call List**: Prospección telefónica con tracking automático
- 🎯 **AI Lead Scoring**: NVIDIA Kumo predictions (conversion probability 0-100%)
- 📈 **Real-time Analytics**: Campaign breakdown, loss reasons, success rates
- 🔄 **n8n Integration**: Webhook automation & data sync
- 💾 **Live Sync**: Firestore real-time across all users
- 🇵🇷 **Spanish-first**: Optimized for Hispanic market

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JS, HTML5, CSS3 |
| **Database** | Firebase Firestore (real-time) |
| **ML** | NVIDIA Kumo Relational Classification |
| **Automation** | n8n webhooks |
| **Auth** | Firebase Auth (optional) |

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/vcall405/tucarroplus-crm.git
cd tucarroplus-crm
npm install
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with:
- **Firebase**: Project ID, API keys from Firebase Console
- **Kumo API**: NVIDIA key (stored in Claude memory, expires Dec 15, 2026)
- **n8n**: Webhook URL (optional)

### 3. Run

```bash
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
tucarroplus-crm/
├── public/
│   ├── index.html              # Main CRM UI (Kanban + Calls + Strategy)
│   └── assets/                 # Images & branding
├── src/
│   ├── components/             # UI components (Board, CallList, etc.)
│   ├── hooks/                  # Firestore hooks, ML hooks
│   └── utils/                  # Formatters, API wrappers
├── ml/
│   ├── kumo-schema.json        # NVIDIA Kumo relational schema
│   ├── data-transform.js       # leads → Kumo format
│   └── predictions.js          # Execute Kumo predictions
├── docs/
│   ├── ARCHITECTURE.md         # System design & decisions
│   ├── KUMO-SETUP.md          # ML integration (step-by-step)
│   └── DATA-STRUCTURE.md      # Firestore schema reference
├── scripts/
│   └── export-training-data.js # Batch export for model training
└── README.md                   # You are here
```

## Data Model (Firestore)

### `leads` Collection

```javascript
{
  // Identity
  id: "auto-generated",
  name: "Carlos Medina",
  phone: "787-555-1234",
  vendor: "Miguel",
  
  // Lead Details
  vehicle: "2025 Toyota RAV4 Hybrid SE",
  source: "facebook|whatsapp|llamada|anuncio|prospeccion|referido|showroom",
  campaign: "La guagua que todas las familias quieren",
  notes: "Interesado en financiamiento",
  
  // Status Tracking
  status: "nuevo|contactado|cita|negociando|vendido|perdido",
  
  // ML Predictions (auto-updated by Kumo)
  conversionProbability: 0.78,
  kumoScoreUpdated: "2026-09-16T22:00Z",
  
  // If status = "cita"
  apptDate: "2026-09-20",
  apptTime: "10:00",
  
  // If status = "perdido"
  lossReason: "precio|otro_dealer|financiamiento|no_contesta|otro",
  
  // Timestamps
  createdAt: "2026-09-16T20:30Z",
  updatedAt: "2026-09-16T22:00Z"
}
```

## ML: Kumo Lead Predictions

### What Kumo Analyzes

- **Instance table** (leads): conversion (0/1), days to close
- **Related tables**: 
  - interactions (status changes over time)
  - vehicles (which models researched)
  - context (source, campaign, vendor)

### Score a Lead

```bash
npm run kumo:predict --lead-id "abc123"
# Output: { prediction: "vendido", probability: 0.78 }
```

### Train Model with Historical Data

```bash
npm run kumo:train
# 1. Exports leads from Firestore
# 2. Transforms to Kumo schema
# 3. Uploads to NVIDIA API
# 4. Returns metrics
```

## n8n Automation

### Webhook: Lead Status Change

```json
POST https://n8n2.vcallia.com/webhook/tucarroplus-crm
{
  "event": "lead_status_changed",
  "leadId": "abc123",
  "oldStatus": "contactado",
  "newStatus": "negociando",
  "timestamp": "2026-09-16T22:15Z"
}
```

### Example Workflows

1. **Lead scores high (>0.7)** → Priority tag + vendor notification
2. **3+ days since update** → Auto-follow-up reminder
3. **Status = "vendido"** → Log to accounting, send celebration msg
4. **Lead lost** → Alert manager, capture feedback

## Deployment

### Firebase Hosting (Recommended)

```bash
firebase deploy
# Live at: https://tucarroplus-crm.firebaseapp.com
```

### Vercel + Self-Hosted n8n

```bash
vercel deploy
# Configure env vars in dashboard
```

## Performance

- **Load 1000+ leads**: < 100ms
- **Single Kumo prediction**: ~2s (API latency)
- **Batch 100 predictions**: ~10-15s
- **Real-time sync**: < 200ms (Firestore)

## Security

✅ **Environment variables**: Use `.env`, never commit  
✅ **GitHub token**: Encrypted in Claude memory (expires Dec 15, 2026)  
✅ **Firebase rules**: Can restrict to authenticated users  
✅ **API keys**: Rotate Kumo token every 90 days

## Roadmap

- [ ] Firebase Authentication (email/Google)
- [ ] Lead deduplication (phone matching)
- [ ] SMS/WhatsApp automation
- [ ] Inventario360 sync (vehicle data)
- [ ] PDF reports & dashboards
- [ ] Video call booking (Calendly)
- [ ] Email sequences (SendGrid)
- [ ] Advanced analytics (Metabase)

## FAQ

**Q: How do I get Kumo API key?**  
A: Token stored in Claude memory, valid until Dec 15, 2026. Contact Miguel to renew.

**Q: Can multiple users access simultaneously?**  
A: Yes, Firestore syncs in real-time across browsers.

**Q: How accurate is Kumo prediction?**  
A: Improves with more historical data (50+ leads → good accuracy).

**Q: Can I integrate my own SMS system?**  
A: Yes, webhook to n8n → any provider (Twilio, AWS SNS, etc.)

## Support

- **Issues**: GitHub Issues
- **Questions**: Miguel (@vcall405)
- **Docs**: See `/docs` folder

## License

MIT © 2026 VCallGroup | Miguel Fuentes

---

**Updated**: September 16, 2026  
**Maintained by**: Miguel Fuentes (@vcall405)  
**Region**: Puerto Rico 🇵🇷
=======
# tucarroplus-crm
AI-powered CRM for automotive dealerships + Kumo ML predictions
>>>>>>> 839134006fb4c94629fe0cafb5e109c073cbe5db
