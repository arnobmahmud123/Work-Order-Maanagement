# PropPreserve — Property Preservation Management Platform

A full-stack B2B web application for managing property preservation work orders, field documentation, team messaging, invoicing, and support.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS 4, Lucide icons, TipTap rich text |
| Forms | React Hook Form + Zod |
| Data | TanStack React Query |
| Database | PostgreSQL + Prisma 6 |
| Auth | NextAuth v5 (JWT sessions) |
| Build | Turbopack, standalone output |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Setup

1. **Clone and install dependencies:**

```bash
cd property-preservation-app
npm install
```

2. **Set up environment:**

```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

3. **Generate Prisma client and push schema:**

```bash
npm run db:generate
npm run db:push
```

4. **Seed demo data:**

```bash
npm run seed:demo
```

5. **Start development server:**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@proppreserve.com | password123 |
| Coordinator | coordinator@proppreserve.com | password123 |
| Processor | processor@proppreserve.com | password123 |
| Contractor | contractor@example.com | password123 |
| Client | client@example.com | password123 |

## User Roles

- **CLIENT** — Submit/track work orders, view invoices, messages, reports, support tickets
- **CONTRACTOR** — View assigned jobs, upload photos, message team, track earnings
- **COORDINATOR** — Manage work orders, assign contractors, handle messages
- **PROCESSOR** — Work order processing, QC review, office completion
- **ADMIN** — Full platform access: users, properties, billing, reports, all operations

## Features

### Work Orders
- Full lifecycle management (NEW → CLOSED/CANCELLED)
- Service types: Grass Cut, Debris Removal, Winterization, Board-Up, Inspection, Mold Remediation
- Photo uploads (before/during/after/bid/inspection/docs)
- Task checklists, access codes, special instructions
- Activity history and audit trail

### Messaging
- Threaded conversations tied to work orders
- Slack-like interface with real-time feel
- Message types: comment, system, revision, QC, bid, inspection
- Read receipts, urgency flags, message pinning

### Invoicing
- Create invoices with line items
- Status tracking: Draft → Sent → Paid / Overdue
- No-charge support
- Print-friendly layout

### Support Tickets
- Priority levels: Low, Medium, High, Urgent
- Status workflow: Open → In Progress → Waiting → Resolved → Closed
- Comment threads with internal notes

### Admin
- User management with role assignment
- Property database
- Contractor network
- Financial overview and billing reports
- Analytics and reporting dashboards

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Sign in, sign up pages
│   ├── (marketing)/      # Public pages (services, about, contact)
│   ├── api/              # API routes
│   └── dashboard/        # Protected dashboard pages
├── components/
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Sidebar, top nav
│   └── ...               # Feature components
├── hooks/                # Custom React hooks (data fetching)
├── lib/                  # Utilities, Prisma client, auth config
├── types/                # TypeScript type definitions
└── middleware.ts          # Auth & role-based route protection
```

## Database Schema

The schema includes models for:
- **Users** with role-based access (CLIENT, CONTRACTOR, COORDINATOR, PROCESSOR, ADMIN)
- **Work Orders** with full lifecycle, tasks, files, and history
- **Properties** linked to work orders
- **Threads & Messages** for team communication
- **Invoices & Invoice Items** for billing
- **Support Tickets & Comments** for help desk
- **Notifications & Activity Logs** for audit trail

## API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers |
| `/api/auth/register` | POST | User registration |
| `/api/work-orders` | GET, POST | List/create work orders |
| `/api/work-orders/[id]` | GET, PATCH, DELETE | Work order CRUD |
| `/api/messages/threads` | GET, POST | List/create threads |
| `/api/messages/threads/[id]` | GET, POST | Thread detail + send message |
| `/api/invoices` | GET, POST | List/create invoices |
| `/api/invoices/[id]` | GET, PATCH | Invoice detail + update |
| `/api/support` | GET, POST | List/create tickets |
| `/api/support/[id]` | GET, PATCH | Ticket detail + update |
| `/api/admin/users` | GET, PATCH | User management |
| `/api/dashboard/stats` | GET | Dashboard statistics |

## Deployment

### Vercel

```bash
npm run build
```

The app uses `output: "standalone"` for optimal deployment. Set environment variables in your deployment platform.

### Docker

```bash
docker build -t proppreserve .
docker run -p 3000:3000 proppreserve
```

## License

Proprietary — All rights reserved.
"# Work-Order-Maanagement" 
