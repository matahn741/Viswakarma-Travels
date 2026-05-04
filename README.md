# Vishwakarma Travels — website

Mobile-friendly taxi site built with [Astro](https://astro.build) and Tailwind CSS. **Bike taxi remains a key offering** alongside other vehicles. Customers book a ride, select pick-up and drop points (including current location capture), pay via UPI, upload a payment screenshot, and you get an instant **Telegram** notification with all ride details and the image.

## Requirements

- **Node.js 18+** and npm (install from [nodejs.org](https://nodejs.org) if `npm` is not on your PATH).

## Local development

```bash
cd Vishwakarma-Travels
npm install
cp .env.example .env
# Edit .env — add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (see below).
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:4326`). The booking API only works when env vars are set.

## Editing content (service area, vehicles, UPI, contact)

All business copy and fleet options live in **[`src/config/site.ts`](src/config/site.ts)**:

- `siteMeta` — business name, tagline, phone, email.
- `bikes` — editable vehicle list (bike taxi, car, auto by default). Add/remove options anytime.
- `serviceCoverage` — current operating area (default: Madurai and surrounding areas) and planned expansion area (all Tamil Nadu).
- `upi` — UPI VPA (`id`), payee name, and payment instructions.
- Optional **merchant QR** for customers: add a PNG as **`public/upi-merchant-qr.png`**. If the file is missing, the booking page hides the image automatically.

Replace **`public/favicon.svg`** if you add a logo.

After editing, save the file. Deployed sites rebuild on git push; locally, refresh the browser (restart `npm run dev` if needed).

## Telegram setup (notifications)

1. In Telegram, open **@BotFather** → `/newbot` → follow prompts → copy the **bot token**.
2. Start a chat with your new bot (tap **Start**).
3. Get your **chat id** (numeric). Common options: message **@userinfobot**, or use the Telegram “getUpdates” API after messaging your bot.
4. Set environment variables (never commit real tokens):

   | Variable | Description |
   |----------|-------------|
   | `TELEGRAM_BOT_TOKEN` | Token from BotFather |
   | `TELEGRAM_CHAT_ID` | Your user id (string or number as string) |

   For local dev, put them in **`.env`**. For production, set them in your host’s project settings.

Each successful booking sends:

1. A text message with selected vehicle, date/time, contact, pick-up and drop, optional coordinates, and reference.
2. The uploaded file as a **document** with a caption that includes the same reference.

### Local Telegram test checklist

1. Ensure `.env` contains both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
2. Run `npm run dev` and open `http://localhost:4326/book`.
3. Submit one booking with:
   - Name
   - Phone number
   - Vehicle
   - Pickup
   - Drop
   - Payment proof image
4. Confirm Telegram receives a message containing:
   - `Name: ...`
   - `Phone: ...`
   - `Vehicle: ...`
   - `Pickup: ...`
   - `Drop: ...`
   - date/time + reference
5. Confirm Telegram also receives the uploaded proof image.

## Deploy (Vercel — recommended)

This project uses the **[`@astrojs/vercel`](https://docs.astro.build/en/guides/integrations-guide/vercel/)** adapter (`output: "hybrid"`) so static pages stay fast and **`/api/booking`** runs as a serverless function.

1. Push the repo to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com), **Import** the repo, framework **Astro** (auto-detected).
3. Add **Environment Variables**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
4. Deploy. Test the live **Book a ride** flow end-to-end.

## Deploy (Netlify)

Netlify needs the Netlify adapter instead of Vercel:

1. Install: `npm install @astrojs/netlify` and remove `@astrojs/vercel`.
2. In **`astro.config.mjs`**, replace the Vercel adapter with `netlify()` from `@astrojs/netlify`.
3. Connect the repo in Netlify and set the same env vars.

(Exact adapter API may vary by Astro major version; see [Astro Netlify guide](https://docs.astro.build/en/guides/deploy/netlify/).)

## Security notes

- **HTTPS** on the host encrypts traffic; **bot token** stays server-side only.
- Payment is **UPI outside** the site; you verify manually from Telegram + screenshot.
- Uploaded images are validated (type + **5 MB** max) then forwarded to Telegram; they are not stored on disk in this version.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
