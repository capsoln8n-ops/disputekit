# DisputeKit

AI-powered Stripe chargeback dispute management. Connect your Stripe account, view disputes, generate AI responses, and submit directly to Stripe.

## Features

- **Stripe OAuth Integration** - Connect your Stripe account with one click
- **Dispute Dashboard** - View all your chargebacks in one place
- **AI Response Generation** - Generate compelling dispute responses using OpenRouter AI
- **Direct Submission** - Submit evidence directly to Stripe from the app
- **Win Rate Tracking** - Track your dispute outcomes over time

## Tech Stack

- **Frontend/Backend**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: OpenRouter API
- **Payments**: Stripe API

## Getting Started

### Prerequisites

1. Node.js 18+
2. A [Supabase](https://supabase.com) account
3. A [Stripe](https://stripe.com) account
4. An [OpenRouter](https://openrouter.ai) API key

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/disputekit.git
   cd disputekit
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_CLIENT_ID=ca_xxx
   NEXT_PUBLIC_STRIPE_CLIENT_ID=ca_xxx
   
   OPENROUTER_API_KEY=sk-or-xxx
   
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Visit** http://localhost:3000

---

## ⚠️ Stripe Connect Setup Required

Before you can charge users, you need to set up Stripe Connect:

### For Development (Testing)

1. Go to [Stripe Dashboard → Connect → OAuth](https://dashboard.stripe.com/test/connect/oauth)
2. Create a new Connect settings
3. Set the Redirect URI to: `http://localhost:3000/api/stripe/callback`
4. Note your Client ID (`ca_xxx`) and add to env

### For Production

1. Apply for Stripe Connect in [Stripe Dashboard → Connect → Register](https://dashboard.stripe.com/connect/registers)
2. You'll need to provide:
   - Business information
   - Bank account for payouts
   - Privacy policy & terms
3. After approval, set up the Redirect URI for your production URL

**Note**: The app uses Stripe OAuth to connect accounts, but to actually receive payments from users, you need to complete Stripe Connect onboarding. The app will work for testing with your own Stripe account immediately, but you cannot charge other users until approved.

---

## Deployment

### Vercel (Frontend + API)

```bash
npm i -g vercel
vercel
```

Add your environment variables in the Vercel dashboard.

### Environment Variables for Production

Same as development, but set:
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## License

MIT