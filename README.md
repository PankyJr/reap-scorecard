# REAP Scorecard System

A full-stack B-BBEE scorecard and procurement analysis platform designed to help businesses track compliance, evaluate supplier contributions, and generate actionable insights.

## 🚀 Live Demo
https://reap-scorecard.vercel.app

---

## 🧠 Overview

The REAP Scorecard System enables companies to:

- Manage company profiles
- Perform procurement assessments
- Calculate B-BBEE scorecards
- Track performance over time
- Generate structured insights and reports

This system is designed with scalability, performance, and real-world business use in mind.

---

## ⚙️ Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Charts:** Recharts
- **Deployment:** Vercel

---

## 📊 Core Features

### Company Management
- Create and manage multiple companies
- View performance metrics and history

### Procurement Assessments
- Track supplier contributions across B-BBEE categories:
  - All B-BBEE Suppliers
  - QSEs
  - EMEs
  - 51% Black Owned
  - Black Women Owned
  - Designated Groups
- Automatic score calculation based on targets

### Scorecard System
- Calculate B-BBEE levels
- Track performance across key pillars:
  - Ownership
  - Management Control
  - Skills Development
  - Enterprise Development
  - Socio-Economic Development

### Insights & Analytics
- Identify strongest and weakest categories
- Highlight performance gaps
- Portfolio-level trends across companies

### Secure Architecture
- Supabase Auth (email + OAuth)
- Row Level Security (RLS)
- Owner-based access control

---

## 🧱 Architecture

- Server Components + Server Actions (Next.js)
- Repository pattern for data access
- Supabase as the single source of truth
- Revalidation for real-time UI updates

---

## 🔐 Environment Variables

Create a `.env.local` file:
