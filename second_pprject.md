Dhaka Founders 🇧🇩🚀

Dhaka Founders is a premium, modern, and highly interactive directory and connection platform designed for Bangladesh's tech builders. It serves as a central hub where innovators, investors, and founders showcase their startups, build professional profiles, and discover collaborator networks.

Built on Next.js (App Router), TypeScript, Supabase SSR, and Clerk, the application delivers a premium dark-themed experience with fluid glassmorphism, responsive grids, and micro-animations.
🌟 Core Features
1. Interactive Startup Directory

    Live Search: Real-time filtering of startups by name, description, category, or founder display name.
    Category Filter Chips: Responsive selector buttons to filter startups by industry sectors (e.g., FinTech, AgriTech, EdTech, Software, E-Commerce).
    Builder Cards: Modern hover-animated cards displaying startup taglines, category badges, website/portfolio links, and founder metadata.
    Direct Connect: Highlighting founder names with direct links pointing to their public profile pages.
    Dynamic Avatars: Startup cards show the actual profile pictures of their creators, synced dynamically from their founder profiles (with automatic initials fallbacks if no image exists).

2. Multi-Startup Founder Dashboard

    Decoupled Relations: DEC-level structural change allowing a single founder to list and manage multiple startups under one account.
    Startup CRUD Controls: Create, edit, and delete listed startups directly from the dashboard via modal forms.
    Save Indicators: Fluid theme-matched loader overlay blocking interactions during writes to provide real-time status feedback.

3. Sleek Interactive Avatar Uploader

    Visual Circle Picker: An interactive, rounded profile picture widget in the editor with smooth hover states.
    Camera Overlay: Hovering overlays a camera icon with "Upload" text.
    Live Preview: Selecting a local image file instantly renders it inside the circle, showing the founder exactly what their avatar looks like before saving.
    10MB Limit Support: Increased Next.js Server Actions payload limit to 15MB (experimental.serverActions.bodySizeLimit) to support high-resolution file selections from modern phones.

4. Bidirectional Clerk Profile Syncing

    Local to Clerk Upload: Choosing a local avatar file converts it to a binary Blob on the server, uploads it directly to Clerk via the Backend SDK, and saves Clerk's optimized public CDN image URL to Supabase.
    Clerk to Local Update: If a user updates their profile picture through Clerk's direct interface (e.g., Clerk User Button), the app automatically detects the delta on fetch and updates the Supabase record.
    Clean Resets: Clearing the avatar automatically deletes the custom picture on Clerk, resetting it to default initials.

5. Dynamic Public Profile Viewer (/founder/[clerk_auth_key])

    Public URL Pages: Dynamic routes showcasing a founder's bio, email address, LinkedIn, and portfolio link on the left-column card.
    Portfolio Grid: Displays a grid of all the startups registered under their key on the right-column section.

6. Self-Service Account Deletion

    Settings Dialog: Access account management next to profile editing controls.
    Double Confirmation Modal: Requires typing "DELETE" in the input to trigger a clean account removal.
    Cascading Wipes: Server actions completely delete user startups and founder profiles in Supabase, followed by deleting their auth credentials in Clerk.

7. Brand DNA & Design Language

    Typography: Outfitted with Inter and Outfit fonts.
    Glassmorphic UI: Translucent cards (bg-surface-glass), borders (border-primary/10), and backdrops (backdrop-blur-2xl) using custom HSL tailwinds.
    Centered Layouts: Logo, navigation links (Home, Directory, Dashboard), and auth buttons are spaced using CSS Grid layouts centered across viewports.

8. Full Phone Screen Responsiveness

    Mobile Hamburg Drawer: Navigation collapses on mobile viewports with a fluid menu slide.
    Adaptive Grids: Grids dynamically drop columns on smaller phone screens.
    No Overflow: Margin and padding thresholds optimized for standard 375px to 414px viewports.

9. Page Transition Loading Indicators

    Root Suspense Boundaries: Configured a global app/loading.tsx handler that captures Next.js client-side page transitions.
    Visual Indicators: Features a top-running gradient progress bar showing active page fetching status, paired with a central glassmorphic spinner card displaying "Loading Page..." to prevent blank states.

🛠️ Technology Stack

    Framework: Next.js 16 (App Router & Turbopack)
    Language: TypeScript
    Styling: Tailwind CSS v4 & Vanilla CSS
    Authentication: Clerk (custom-designed dark theme)
    Database: Supabase (PostgreSQL with custom RLS Policies)
    Icons: Lucide React

📂 Project Architecture

├── app
│   ├── actions                 # Server Actions (CRUD, Syncing, Deletion)
│   │   └── startup.ts
│   ├── dashboard               # Private Founder Dashboard
│   │   ├── page.tsx
│   │   └── DashboardClient.tsx
│   ├── directory               # Searchable Startups Directory
│   │   ├── page.tsx
│   │   └── DirectoryClient.tsx
│   ├── founder                 # Dynamic Public Profiles
│   │   └── [clerk_auth_key]
│   │       └── page.tsx
│   ├── layout.tsx              # Global Theme Layout & Clerk Config
│   └── page.tsx                # Home Landing Page
├── components
│   └── Navbar.tsx              # Centered Navigation Component
├── utils
│   └── supabase
│       ├── client.ts           # Supabase Client SDK Instance
│       └── server.ts           # Supabase Server SDK Instance
└── next.config.ts              # Next.js Server Configurations (Body Size Limits)

🚀 Setup & Installation
1. Clone the repository and install dependencies

npm install

2. Configure environment variables (.env.local)

Create a .env.local file in the root directory and add:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

3. Run the development server

npm run dev

Open http://localhost:3000 in your browser to see the platform.
4. Build for production

npm run build


DhakaFounders 🚀

Bangladesh's Premier Startup Directory — discover, connect, and grow within Dhaka's startup ecosystem.
Overview

DhakaFounders is a full-stack web platform that curates and showcases startup profiles from the Dhaka tech scene. Founders can list their companies, and visitors can search, filter, and connect with startups across 12+ industry sectors.
Tech Stack
Layer 	Technology
Framework 	Next.js 16 (App Router & Turbopack)
Language 	TypeScript
Styling 	Tailwind CSS v4 + Vanilla CSS (inline + <style> blocks)
Auth 	Clerk
Database 	Supabase (PostgreSQL)
Fonts 	Inter + Plus Jakarta Sans (Google Fonts via next/font)
Icons 	Lucide React
Project Structure

dhakafounders/
├── app/
│   ├── layout.tsx              # Root layout (Clerk, Navbar, Footer, fonts)
│   ├── globals.css             # Design system tokens, utility classes
│   ├── page.tsx                # Home page (Hero, Stats, Features, CTA)
│   ├── directory/
│   │   ├── page.tsx            # Directory listing page (server component)
│   │   └── [id]/
│   │       └── page.tsx        # Company detail page (fully responsive)
│   └── dashboard/              # Authenticated founder dashboard
├── components/
│   ├── Navbar.tsx              # Responsive navigation bar
│   ├── Footer.tsx              # Site footer
│   ├── Hero.tsx                # Homepage hero section
│   ├── StatsBar.tsx            # Live ecosystem statistics
│   ├── DirectoryClient.tsx     # Client-side search & filter UI
│   └── StartupCard.tsx         # Individual startup card component
├── utils/
│   └── supabase/               # Supabase client helpers (server + browser)
├── middleware.ts               # Clerk auth middleware (route protection)
└── next.config.ts

Routes
Route 	Description
/ 	Landing page with hero, stats, features, testimonials
/directory 	Searchable & filterable startup directory
/directory/[id] 	Individual company profile page
/dashboard 	Protected founder dashboard (requires sign-in)
Getting Started
Prerequisites

    Node.js 18+
    A Supabase project
    A Clerk application

Environment Variables

Create a .env.local file in the root with the following:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

Installation & Development

npm install
npm run dev

Open http://localhost:3000 in your browser. Note that in Next.js 16, Turbopack is enabled by default for both development (next dev) and production (next build).
Design System

The design system lives in app/globals.css and uses CSS custom properties:

    Colors: --color-primary, --color-brand-blue, --color-brand-off-white, etc.
    Typography: --font-heading (Inter), --font-body (Plus Jakarta Sans)
    Utilities: .btn-primary, .btn-secondary, .glass-card, .section-container, .badge

Industry Sectors

The directory covers 12 sectors: FinTech · HealthTech · EdTech · AgriTech · E-Commerce · Logistics · SaaS · Climate Tech · FoodTech · HRTech · PropTech · AI & ML
Database Schema

The primary table is company_profile with fields including:

id, company_name, description, category, founder_name, founder_emai


haka Founders

This repository represents an educational project developed as an assignment for the Full-Stack Web Apps with Vibe Coding course by Datavvy Academy.

    Live Deployment: dhakafounders0.netlify.app
    Original Production Platform: dhakafounders.com

Dhaka Founders is a collaborative directory connecting startup founders, developers, and investors across Bangladesh's tech ecosystem. The platform enables startups to showcase their metrics, list active job openings, post milestones, share pitch videos, and request direct connections.
Features

    Startup Directory: Search, filter, and discover active tech companies in Bangladesh.
    Founder Dashboard: Manage company profiles, post active recruitment needs, share pitch deck videos, toggle actively raising status, and list milestones.
    Connection Management: Send connection requests to other startups or investors, with live dashboard accept/decline actions.
    Ecosystem Content: Explore curated startup guides, blogs, and community mixers/meetups.

Tech Stack

    Framework: Next.js 16 (App Router)
    Library: React 19
    Database: Supabase
    Authentication: Clerk Auth
    Styling: Tailwind CSS v4 & custom glassmorphism utilities
    Icons: Lucide React

Getting Started
Prerequisites

    Node.js 18+
    A Clerk Account (for authentication)
    A Supabase Project (for database storage)

Environment Setup

Create a .env.local file in the root directory and configure the following variables:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

Database Schema Setup

Execute the following queries inside your Supabase project's SQL Editor to set up the database tables:
1. Company Profile Table

DROP TABLE IF EXISTS public.company_profile CASCADE;

CREATE TABLE public.company_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_auth_key TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  website_url TEXT,
  category TEXT,
  description TEXT,
  founder_name TEXT NOT NULL,
  founder_email TEXT,
  linkedin_url TEXT,
  hq_location TEXT,
  team_size TEXT,
  funding_stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" 
  ON public.company_profile 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert access" 
  ON public.company_profile 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access" 
  ON public.company_profile 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

2. Connection Requests Table

create table public.connection_request (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  sender_profile_id uuid references public.company_profile(id) on delete cascade not null,
  receiver_profile_id uuid references public.company_profile(id) on delete cascade not null,
  message text,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')) not null,
  
  constraint unique_active_connection unique (sender_profile_id, receiver_profile_id)
);

alter table public.connection_request disable row level security;

Installation

    Clone the repository:

    git clone https://github.com/adibbhossain/dhakafounders.git
    cd dhakafounders

    Install dependencies:

    npm install

    Run the local development server:

    npm run dev

    Build for production:

    npm run build

License

This project is licensed under the MIT License - see the LICENSE file for details.