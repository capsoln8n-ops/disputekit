# DisputeKit - Product Specification

## 1. Problem Statement

E-commerce sellers and SaaS founders receive chargebacks from Stripe but lack the time or expertise to craft winning responses. Existing solutions are expensive ($99+/mo) or require manual work. DisputeKit provides: connect your Stripe account, see all disputes, and generate AI-powered response drafts in seconds.

---

## 2. MVP Feature List

### Core Features (MVP - $49/mo)

1. **Stripe Account Connection**
   - OAuth flow to connect user's Stripe account
   - Secure token storage
   - Reconnect capability if tokens expire

2. **Dispute Dashboard**
   - List all open/pending disputes from connected Stripe account
   - Show dispute reason, amount, date, status
   - Filter by status (needs_response, won, lost)
   - Sort by date or amount

3. **Dispute Detail View**
   - Full dispute details: reason, amount, evidence deadline
   - Transaction details (what was purchased)
   - Customer history (prior disputes, chargebacks)
   - Recent payments from customer

4. **AI Response Generator**
   - Generate response draft using OpenRouter API
   - Pre-built prompts optimized for each dispute reason
   - Editable response before submission

5. **Evidence Submission**
   - Submit response directly to Stripe via API
   - Track submission status

6. **Dispute History & Analytics**
   - View past disputes (won/lost)
   - Win rate stats
   - Total amount disputed/resolved

---

## 3. User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│   Sign Up   │────▶│ Connect     │────▶│  Dashboard  │
│   Page      │     │  (Email)    │     │ Stripe     │     │ (Disputes)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                     │
                                                                     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Submit    │◀────│   Review    │◀────│  Generate   │◀────│   Dispute  │
│   to Stripe │     │   Response  │     │ AI Response │     │   Detail    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Detailed Steps:

1. **Landing Page**
   - Hero: "Win your Stripe chargebacks"
   - Value prop: "AI-generated dispute responses in seconds"
   - Pricing: $49/mo
   - CTA: "Start Free Trial" → Sign up

2. **Sign Up**
   - Email + password
   - No payment required to start (free trial mode)

3. **Connect Stripe**
   - Click "Connect Stripe" → redirect to Stripe OAuth
   - Return to app with auth code → exchange for tokens
   - Store encrypted tokens in database

4. **Dashboard**
   - Fetch disputes from Stripe API on page load
   - Display in table: Reason | Amount | Status | Due Date
   - Click row → Dispute Detail

5. **Dispute Detail**
   - Show all dispute data from Stripe
   - "Generate Response" button

6. **Generate Response**
   - Call OpenRouter API with dispute context
   - Display generated response in textarea
   - User edits if needed

7. **Submit to Stripe**
   - POST evidence to Stripe via API
   - Show success/failure
   - Update dispute status

---

## 4. Database Schema (Supabase)

### Tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, cancelled
  subscription_tier VARCHAR(50) DEFAULT 'free' -- free, pro
);

-- Connected Stripe accounts
CREATE TABLE stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255) NOT NULL,
  stripe_email VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Disputes (cached from Stripe)
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255) REFERENCES stripe_accounts(stripe_account_id),
  stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
  charge_id VARCHAR(255),
  reason VARCHAR(100),
  amount INTEGER, -- in cents
  currency VARCHAR(10),
  status VARCHAR(50), -- needs_response, won, lost, under_review, warning
  evidence_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Generated evidence/responses
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  submitted_to_stripe BOOLEAN DEFAULT FALSE,
  stripe_evidence_id VARCHAR(255),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_disputes_user ON disputes(user_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_stripe_accounts_user ON stripe_accounts(user_id);
CREATE INDEX idx_evidence_dispute ON evidence(dispute_id);
```

---

## 5. API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login, return JWT
- `POST /api/auth/logout` - Invalidate session

### Stripe Integration
- `GET /api/stripe/connect` - Get Stripe OAuth URL
- `GET /api/stripe/callback` - Handle OAuth callback
- `POST /api/stripe/reconnect` - Refresh tokens
- `DELETE /api/stripe/disconnect` - Disconnect account

### Disputes
- `GET /api/disputes` - List user's disputes
- `GET /api/disputes/:id` - Get dispute details
- `POST /api/disputes/:id/sync` - Force sync from Stripe

### Evidence
- `POST /api/disputes/:id/generate` - Generate AI response
- `POST /api/disputes/:id/submit` - Submit evidence to Stripe
- `GET /api/disputes/:id/evidence` - Get submitted evidence

### User
- `GET /api/user` - Get profile
- `PATCH /api/user` - Update profile
- `GET /api/user/stats` - Get win rate, totals

### Webhooks (Stripe)
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

---

## 6. Stripe Integration Plan

### OAuth Flow
```
1. User clicks "Connect Stripe"
2. Redirect to: https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_xxx&scope=read_write
3. User authorizes
4. Stripe redirects to /api/stripe/callback?code=xxx
5. Backend exchanges code for tokens:
   POST https://api.stripe.com/oauth/token
   - grant_type: authorization_code
   - code: xxx
6. Store access_token, refresh_token (encrypted)
```

### API Access Needed
- `disputes.read` - Read dispute details
- `disputes.write` - Submit evidence
- `read` - General read access

### Webhooks (Optional for MVP)
- `chargeback.updated` - Notify when dispute status changes
- For MVP: Poll Stripe API every 15 min instead of webhooks

---

## 7. Tech Stack

| Component | Service | Free Tier | Notes |
|-----------|---------|-----------|-------|
| Frontend | Next.js on Vercel | Unlimited | React, TypeScript |
| Backend | Next.js API Routes | Unlimited | Runs on Vercel too |
| Database | Supabase | 500MB, 20k rows | PostgreSQL |
| Auth | Supabase Auth | 50k MAU | Email + password |
| Stripe | Stripe API | Free API | OAuth + dispute API |
| AI | OpenRouter | $0 budget | Use configured instance |
| Hosting | Vercel | Unlimited | Frontend + backend |

**Total: $0**

---

## 8. MVP Pricing

- **Free trial:** 3 disputes (or 14 days)
- **Pro:** $49/month - Unlimited disputes, priority support
- **Payment:** Stripe Checkout (we become a Stripe app)

---

## 9. Out of Scope (v1)

- Multiple Stripe accounts per user
- Team/collaboration
- Email notifications
- Mobile app
- Custom templates
- Webhooks (use polling)
- Refund management
- Reporting dashboard beyond basic stats

---

## 10. Milestones

1. **M1:** Project setup, Supabase schema, basic auth
2. **M2:** Stripe OAuth connection flow
3. **M3:** Dispute list + detail views
4. **M4:** OpenRouter AI response generation
5. **M5:** Submit evidence to Stripe
6. **M6:** Basic stats/history
7. **M7:** Landing page + pricing
8. **M8:** Deploy to Vercel, test end-to-end
9. **M9:** Stripe Connect onboarding (for payments)

---

## 11. Security Considerations

- Encrypt Stripe tokens at rest (AES-256)
- Never log sensitive data
- Rate limit AI generation
- Validate all Stripe webhook signatures
- HTTPS only in production
