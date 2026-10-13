# Studio Inventory – Smart Packing for Godrej Ananda

A PWA inventory + packing assistant for your secondary studio apartment.

## Features
- **Days selector** → calculates exact clothes/gear you need
- **Activity modes** (swimming, badminton, tennis, squash, running, gym) → auto-adds rackets, swim gear, running shoes etc.
- **Live inventory** at the studio (clothes, kitchen, misc, sports)
- **Photo AI**: snap drawer/fridge/shelf → Gemini proposes items → you approve before anything is written
- **PWA**: installable on iPhone home screen
- Offline-first (localStorage). Firebase ready for multi-device sync.

## Quick Start

```bash
cd studio-inventory
npm install
cp .env.example .env
# Edit .env with your Firebase + Gemini keys
npm run dev
```

Open http://localhost:5173

### iPhone install
1. Open in Safari
2. Share → Add to Home Screen

### Firebase (optional but recommended for sync)
1. Create project at console.firebase.google.com
2. Enable Auth (Google), Firestore, Storage
3. Copy config into `.env`
4. (Later) replace localStorage with Firestore listeners – the structure is already there.

### Gemini
1. Go to https://aistudio.google.com/apikey
2. Create key → put in `.env` as `VITE_GEMINI_API_KEY`
3. Without key the photo feature returns realistic mock data so you can still demo the flow.

## GitHub
Just `git init && git add . && git commit -m "initial"` and push.

## Customising packing rules
Edit `src/lib/packingRules.ts` – change `perDay`, `base`, or `activityBonus` values.

Built for real weekend use. No bullshit features.
