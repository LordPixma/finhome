# Finhome360 Marketing Site

This is the landing page for [finhome360.com](https://finhome360.com) - a single-page marketing website that introduces visitors to the Finhome360 platform.

## Overview

The marketing site is built with:
- **Next.js 14** with App Router
- **React 18**
- **Tailwind CSS** for styling
- **TypeScript** for type safety

## Development

```bash
# Install dependencies (from root)
npm install

# Start development server
cd apps/marketing
npm run dev

# Or from root using Turbo
npm run dev
```

The site will be available at http://localhost:3001

## Features

- **Hero Section**: Compelling headline and call-to-action
- **Features**: 6 key features with icons and descriptions
- **Benefits**: Detailed explanation of the 360° approach
- **CTA Section**: Final call-to-action to drive conversions
- **Responsive Design**: Mobile-first, works on all devices

## Deployment

The site is designed to be deployed to **finhome360.com** (root domain), while the web app runs on **app.finhome360.com**.

### Cloudflare Pages Deployment

1. Create a new Cloudflare Pages project
2. Connect to this repository
3. Set build settings:
   - **Build command**: `cd apps/marketing && npm run build`
   - **Build output directory**: `apps/marketing/.next`
   - **Framework preset**: Next.js
4. Set custom domain to `finhome360.com`

## Content

The site explains:
- What Finhome360 does (personal finance management)
- Key features (analytics, budgeting, investments)
- The 360° approach to financial visibility
- Call-to-action to launch the app

## Structure

```
apps/marketing/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with metadata
│   │   ├── page.tsx        # Landing page
│   │   └── globals.css     # Global styles
│   └── components/         # Reusable components (future)
├── public/                 # Static assets
└── package.json
```
