# Instant Quote (Next.js 14)

Production-ready Next.js 14 App Router app that replicates a 4-step Instant Quote flow for lawn care:

- Step 1: Address + service selection
- Step 2: Map measurement (Google Maps polygon drawing)
- Step 3: Services review/recommendations + live total
- Step 4: Lead form + SendGrid email delivery

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (persisted localStorage store)
- Google Maps JavaScript API (Places, Drawing, Geometry)
- SendGrid (`@sendgrid/mail`)

## Project Structure

- `app/page.tsx` - Step 1
- `app/measure/page.tsx` - Step 2
- `app/services/page.tsx` - Step 3
- `app/schedule/page.tsx` - Step 4
- `app/api/quote/route.ts` - SendGrid API route
- `components/*` - UI components for each step
- `store/quoteStore.ts` - persisted quote store
- `lib/tiers.ts` - pricing tier table
- `lib/pricing.ts` - pricing engine
- `lib/emailTemplate.ts` - dark HTML email template
- `lib/sendgrid.ts` - SendGrid sending helper

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` values:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `OWNER_EMAIL`
- `APP_BASE_URL` (for deployment reference)

4. Start dev server:

```bash
npm run dev
```

5. Open:

- [http://localhost:3000](http://localhost:3000)

## Google Maps API Setup

In Google Cloud Console:

1. Create or select a project.
2. Enable APIs:
- Maps JavaScript API
- Places API
- Geocoding API
3. Create an API key.
4. Restrict key by HTTP referrers:
- `http://localhost:3000/*`
- Your production domain (for Vercel), for example `https://demo.instant-quote.online/*`
5. Set key as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Pricing Engine

The pricing logic is in `lib/pricing.ts` and uses tiers from `lib/tiers.ts`.

- `findTier(sqft)` clamps outside values to first/last tier
- Mowing price switches by frequency (`weekly` vs `biweekly`)
- Total is sum of selected service line items

## API Contract (`POST /api/quote`)

Request body:

```json
{
  "name": "Jane Doe",
  "phone": "8015551234",
  "email": "jane@example.com",
  "address": "123 Main St, Salt Lake City, UT",
  "preferredDate": "2026-03-10",
  "sqft": 4200,
  "services": [
    { "key": "mowing", "frequency": "weekly", "price": 76 },
    { "key": "aeration", "price": 119 }
  ],
  "total": 195
}
```

The route validates payload, recalculates server-side pricing, and sends:

- Customer email: `Your Quote for - {{address}}`
- Owner email: `New Instant Quote Lead - {{address}}`

## Test API with curl

Start app locally, then run:

```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "phone": "8015551234",
    "email": "jane@example.com",
    "address": "123 Main St, Salt Lake City, UT",
    "preferredDate": null,
    "sqft": 2000,
    "services": [
      { "key": "mowing", "frequency": "weekly", "price": 52 },
      { "key": "aeration", "price": 89 }
    ],
    "total": 141
  }'
```

## Deploy to Vercel

1. Push repository to GitHub.
2. Import project in Vercel.
3. Set Environment Variables in Vercel project settings:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `OWNER_EMAIL`
- `APP_BASE_URL`
4. Deploy.
5. Add your Vercel domain to Google Maps key referrer allow-list.
6. In SendGrid, verify sender identity for `SENDGRID_FROM_EMAIL`.

## Production Notes

- SendGrid API key is server-side only.
- Client state is persisted via localStorage.
- Map drawing supports multiple polygons and live sqft sum.
- UI is mobile-friendly with accessible form labels and aria labels.
