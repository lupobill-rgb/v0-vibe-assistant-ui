# VIBE Landing Page Template

A production-ready Next.js 14 landing page template built for the VIBE platform. Features a dark navy/slate theme, fully responsive layout, and Tailwind CSS styling.

## Tech Stack

| Technology | Version |
|-----------|---------|
| Next.js (App Router) | 14.2 |
| React | 18 |
| TypeScript | 5 |
| Tailwind CSS | 3 |
| Node.js | ≥ 20 |

## Sections

- **Hero** – Headline, subheadline, primary/secondary CTAs, social-proof line, scroll indicator
- **Features** – Four feature cards with Heroicons, descriptions, and hover effects
- **Pricing** – Three tiers (Starter, Pro, Enterprise) with a highlighted "Most Popular" card
- **Contact** – Accessible form with name, email, message fields and client-side success feedback
- **Footer** – Brand, navigation columns, social links, copyright

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for production

```bash
npm run build
npm start
```

## Customization

| What to change | Where |
|----------------|-------|
| Site title & meta description | `app/layout.tsx` – `metadata` export |
| Hero headline & CTAs | `app/components/Hero.tsx` |
| Feature cards | `app/components/Features.tsx` – `features` array |
| Pricing plans | `app/components/Pricing.tsx` – `plans` array |
| Footer links | `app/components/Footer.tsx` – `links` array |
| Brand colours | `tailwind.config.ts` – `theme.extend.colors` |
| Form submission logic | `app/components/Contact.tsx` – `handleSubmit` function |

## Connecting the Contact Form

The `handleSubmit` function in `app/components/Contact.tsx` currently contains a placeholder `setTimeout`. Replace it with your preferred delivery method:

- **API Route** – Create `app/api/contact/route.ts` and `fetch('/api/contact', { method: 'POST', body: JSON.stringify(form) })`
- **Resend** – `npm install resend` then call `resend.emails.send(...)` inside an API route
- **Formspree** – POST the form data to your Formspree endpoint

## Deployment

The template deploys to any platform that supports Next.js:

- **Vercel** – `npx vercel` (zero-config)
- **Netlify** – connect the repo, set build command to `npm run build`
- **Docker** – add a `Dockerfile` with `next build && next start`

## License

MIT
