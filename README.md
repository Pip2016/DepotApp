# MyDepot - Portfolio Tracker

Portfolio-Tracker Web-App zur strukturierten Verwaltung und Anzeige von Aktien und ETFs.

## Tech-Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (manually configured)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Package Manager:** pnpm
- **Sprache:** TypeScript

## Setup

```bash
# Dependencies installieren
pnpm install

# Development Server starten
pnpm dev

# Production Build
pnpm build
```

## Environment Variables

Erstelle `.env.local`:

```env
FINNHUB_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Features (V1)

- Dashboard mit Portfolio-Übersicht (Gesamtwert, Tagesänderung, Charts)
- Detaillierte Portfolio-Ansicht mit sortierbarer Tabelle
- Einzelaktien-Seite mit Kurschart, Fundamentaldaten und News
- CSV Import (Comdirect & Postbank)
- Manuelles Hinzufügen/Bearbeiten/Löschen von Positionen
- Datenpersistenz via localStorage
- Deutsche Lokalisierung (EUR, Zahlenformat, Datumsformat)
- Responsive Design (Mobile & Desktop)

## APIs

- **Yahoo Finance** (inoffiziell) - Kursdaten & Fundamentals
- **Finnhub** - News (API-Key erforderlich)

## Projektstruktur

```
app/               - Next.js App Router Seiten & API Routes
components/
  ui/              - shadcn/ui Basis-Komponenten
  layout/          - Header, Sidebar, Navigation
  portfolio/       - Portfolio-spezifische Komponenten
  stock/           - Aktien-Detail Komponenten
  import/          - CSV Import Komponenten
  shared/          - Geteilte Komponenten
lib/
  api/             - API Clients (Yahoo Finance, Finnhub)
  csv/             - CSV Parser (Comdirect, Postbank)
  formatters/      - Formatierungsfunktionen (Währung, Zahlen, Datum)
hooks/             - React Hooks
types/             - TypeScript Interfaces
data/              - Mock Daten
```
