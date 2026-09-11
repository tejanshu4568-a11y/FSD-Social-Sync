# Social Sync Pro (Broadcast)

Compose once, schedule everywhere — next-generation social publishing and automation studio built for **LinkedIn** and **Instagram**.

Built with [TanStack Start](https://tanstack.com/start) (React 19) and [Supabase](https://supabase.com) (Authentication + Postgres).

---

## Features

- **Multi-Network Composer**: Draft high-performing content once. Live character counters and validations adapted specifically for **LinkedIn** (3,000 char ceiling) and **Instagram** (2,200 char ceiling + media required).
- **Live Social Previews**: Pixel-accurate preview cards showing how your post will look on LinkedIn feeds and Instagram profile posts.
- **What is Happening (Live Monitor)**: Real-time animated dispatch pipeline ticker showing current handshakes, packaging steps, and connection health.
- **What Happened (Audit Trail)**: Complete chronological event log showing publication timestamps, external delivery IDs (`urn:li:share:...`, `ig_media_...`), character counts, and status receipts.
- **In-App API & Database Setup**: Configure Supabase credentials and social network tokens directly in the app with 1-click connection testing and instant local storage persistence.
- **Zero-Friction Sandbox Demo**: Works instantly on the first try — even before entering API keys or database credentials.

---

## 🚀 Quick Start (Works on First Try)

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```

Open `http://localhost:5173` (or the printed port) in your browser.
Click **"Get Started"** or **"Explore Instant Sandbox Demo"** to access the studio immediately.

---

## 🔑 Connecting Supabase (Step-by-Step)

You can connect Supabase either via the **In-App Setup Center** (click **"API & Supabase Setup"** in the sidebar) or via a `.env` file.

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and log in or create a free account.
2. Click **New Project**, choose a name (e.g. `social-sync-pro`), set a database password, and choose your region.

### Step 2: Run the Complete Schema
1. In your Supabase dashboard, click **SQL Editor** from the left sidebar.
2. Click **New Query**.
3. Open `supabase/schema-complete.sql` from this repository (or copy it directly using the **"Copy Complete SQL"** button inside the in-app Setup Center).
4. Paste the SQL into the editor and click **Run**.
   *This automatically creates the enums, profiles, posts, connected_accounts, post_results tables, RLS policies, and the post-media storage bucket.*

### Step 3: Copy Your API Keys
1. Go to **Project Settings → API** in your Supabase dashboard.
2. Copy:
   - **Project URL** (e.g. `https://your-project.supabase.co`)
   - **anon / publishable API key**

### Step 4: Input the Keys
Either:
- **In the UI**: Click **"API & Supabase Setup"** in the studio sidebar, paste your URL & Anon Key, click **"Test Connection"**, and toggle mode to **Live Supabase**.
- **In `.env`**: Copy `.env.example` to `.env` and fill in:
  ```env
  VITE_SUPABASE_URL=https://your-project-id.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
  ```

---

## 🌐 Connecting Social Network API Keys

### 1. LinkedIn Developer API
1. Visit the [LinkedIn Developer Portal](https://developer.linkedin.com/) and sign in.
2. Click **Create App**. Fill in your App Name and link it to your LinkedIn Company Page.
3. Under the **Products** tab, request access to:
   - **Share on LinkedIn**
   - **Sign In with LinkedIn using OpenID Connect**
4. Under the **Auth** tab:
   - Copy your **Client ID** and **Client Secret**.
   - Add your OAuth redirect URL (e.g. `http://localhost:5173` or your production domain).
5. In Social Sync Pro, open **"API & Supabase Setup" → API Keys** and paste your **Client ID**, **Client Secret**, or user access token.

### 2. Instagram Graph API
1. Ensure your Instagram account is an **Instagram Professional / Creator** account.
2. Link your Instagram account to a **Facebook Page** (via Instagram Settings → Linked Accounts).
3. Go to [Meta for Developers](https://developers.facebook.com/) and click **My Apps → Create App**.
4. Select app type **Business**.
5. Add the **Instagram Graph API** product to your app.
6. Use the Graph API Explorer to generate a User Access Token with permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
7. Copy your **Meta App ID**, **Instagram Business Account ID**, and **Page Access Token** into Social Sync Pro under **"API & Supabase Setup" → API Keys**.

---

## 🛠️ Project Structure

```
├── src/
│   ├── components/
│   │   ├── live-activity-feed.tsx  # "What is happening" & "What happened" monitor
│   │   ├── setup-modal.tsx         # In-app Supabase & API keys settings dialog
│   │   └── ui/                     # Radix UI + Tailwind design system components
│   ├── integrations/supabase/
│   │   ├── client.ts               # Resilient Supabase client with demo fallback
│   │   └── types.ts                # Database types (LinkedIn & Instagram)
│   ├── lib/
│   │   ├── activity-store.ts       # Event log & active dispatch job store
│   │   ├── supabase-config.ts      # API & Supabase config manager + test ping
│   │   ├── platform-constraints.ts # Limits for LinkedIn & Instagram
│   │   ├── posts.functions.ts      # Post creation, listing & deletion
│   │   ├── accounts.functions.ts   # Account connections & status
│   │   └── publisher.client.ts     # Client dispatch engine with live progress
│   └── routes/
│       ├── _authenticated/
│       │   ├── dashboard.tsx       # Overview, metrics & live activity center
│       │   ├── composer.tsx        # Unified post composer & live preview
│       │   ├── accounts.tsx        # LinkedIn & Instagram profile manager
│       │   └── calendar.tsx        # Queue timeline & schedule manager
│       ├── auth.tsx                # Studio authentication & 1-click sandbox
│       └── index.tsx               # Product landing page & interactive preview
├── supabase/
│   └── schema-complete.sql         # 1-click turnkey Supabase schema
└── vite.config.ts                  # Vite + TanStack Start configuration
```

---

## 🚢 Production Build

```bash
npm run build
npm run preview
```
