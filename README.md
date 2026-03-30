# REAP Scorecard System (Internal)

A modern internal tool for Reap Solutions staff to manage companies and run calculations for scorecards.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Charts**: Recharts
- **Icons**: Lucide React

## Local Setup Instructions

### 1. Supabase Initialization
- Sign up or log in to [Supabase](https://supabase.com).
- Create a new project.
- Open the **SQL Editor** in your Supabase dashboard and run the contents of the `supabase/schema.sql` file provided in this repository. 
- Go to **Authentication -> Providers** and make sure Email is enabled. It's recommended to turn "Confirm email" OFF for local testing.

### 2. Environment Variables
Copy the `.env.local.example` file to a new file named `.env.local`:
```bash
cp .env.local.example .env.local
```
Then, update the values with your Supabase **Project URL** and **Anon Key** (found in Project Settings -> API).

### 3. Install Dependencies
Run the following command to install the required packages:
```bash
npm install
```

### 4. Run the Development Server
Start the local development server:
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your web browser.

## Application Architecture

### Clean Calculation Engine
The business rules for scoring are completely isolated from the UI components. 
- **Location**: `src/lib/scorecard/calculateScorecard.ts`
- **Future Changes**: When stakeholders provide the final scoring formulas and logic, **only** this single file needs to be updated. The UI forms and database schema are built to pass inputs into this function, and read the standardized outputs (score, levels, and category breakdowns).

### Routing
All internal routes are protected by Supabase middleware (`src/utils/supabase/middleware.ts`). Attempting to visit `/dashboard` without an active session will redirect to `/login`.

### Database Schema Notes
- Uses Row Level Security (RLS) policies requiring users to be authenticated to manage data.
- Cascading deletes are configured (deleting a `Company` deletes its `Scorecards`; deleting a `Scorecard` deletes its `Inputs` and `Results`).
