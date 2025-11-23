# P2P Procurement System - Frontend

Production-ready React + TypeScript frontend with Tailwind CSS for the Django P2P Procurement System.

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Access at: `http://localhost:3000`

## Features Implemented ✅

### Core Infrastructure
- ✅ TypeScript with strict mode
- ✅ Vite build configuration
- ✅ Tailwind CSS design system
- ✅ React Router v6 routing
- ✅ React Query server state
- ✅ Zustand global state
- ✅ Axios API client with JWT refresh

### Authentication
- ✅ Login page with validation
- ✅ JWT token management (access + refresh)
- ✅ Auto token refresh on 401
- ✅ Protected routes
- ✅ Role-based access control
- ✅ Logout functionality

### Pages & Features
- ✅ **Dashboard**: Role-based widgets, stats, quick actions
- ✅ **Requests List**: Filtering, search, table with pagination
- ✅ **Request Detail**: Full info, items, approval timeline
- ✅ **Create Request**: Dynamic form with items array, validation
- ✅ **Approve/Reject**: Modal dialogs with comments
- ✅ **Orders List**: Finance-only PO management
- ✅ **Order Detail**: PO info, items, PDF generation

### Components
- ✅ Button (vari

ants, sizes, loading)
- ✅ Input (labels, errors, validation)
- ✅ Card (containers with headers)
- ✅ Modal (dialogs)
- ✅ Spinner (loading states)
- ✅ StatusBadge (color-coded statuses)
- ✅ Header (navigation, user menu)
- ✅ MainLayout (page wrapper)

### User Roles
- **staff**: Create PRs, view own requests
- **approver_lvl1**: Approve ≤$1,000
- **approver_lvl2**: Approve all amounts
- **finance**: View POs, generate PDFs
- **admin**: Full access

## Project Structure

```
src/
├── api/               # API layer (client, auth, purchases, orders)
├── components/        # Reusable UI components
│   ├── common/       # Button, Input, Card, Modal, etc.
│   └── layout/       # Header, MainLayout
├── pages/            # Route pages
│   ├── auth/         # Login
│   ├── dashboard/    # Dashboard
│   ├── requests/     # List, Detail, Create
│   └── orders/       # List, Detail
├── routes/           # Routing config
├── store/            # Zustand stores
├── types/            # TypeScript definitions
├── utils/            # Constants, formatters
├── App.tsx
└── main.tsx
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
```

## Next Steps

Advanced features planned:
- Receipt upload & validation
- Document processing status
- Real-time notifications
- Analytics dashboard
- Export to CSV
- Unit tests

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- React Query
- Zustand
- React Hook Form
- Axios

---

**Status**: 85% Complete | Core features functional
