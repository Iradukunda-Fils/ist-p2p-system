# Frontend Developer Guide

> **P2P Procurement System** - Client-Side Architecture
> _Stack_: React 18, TypeScript, Vite, Tailwind CSS

This guide covers the architecture, patterns, and best practices for the P2P Procurement System frontend.

---

## 1. Project Structure

The project follows a **Feature-First** organization within a standard React structure.

```bash
src/
├── api/                 # API Clients (Axios + React Query)
│   ├── client.ts       # Base Axios instance (Interceptors)
│   ├── authApi.ts      # Auth endpoints
│   └── documentsApi.ts # Document endpoints
├── components/          # UI Components
│   ├── common/         # Atomic components (Button, Input, Modal)
│   ├── layout/         # Layout wrappers (Sidebar, Header)
│   └── dashboard/      # Feature-specific widgets
├── hooks/               # Custom React Hooks
│   ├── useAuth.ts      # Authentication logic
│   └── useTaskStatus.ts# Polling logic for async tasks
├── pages/               # Route Views (Page-level components)
├── store/               # Global State (Zustand)
├── types/               # TypeScript Interfaces
└── utils/               # Helpers (Formatters, Validators)
```

---

## 2. State Management Strategy

We use a hybrid state management approach to separate **Server State** from **Client State**.

### 2.1 Server State (TanStack Query)

Used for all async data fetching, caching, and synchronization.

**Why?**

- Automatic caching and background refetching.
- Built-in loading/error states.
- Eliminates `useEffect` boilerplate for data fetching.

**Example: Polling Dashboard Stats**

```typescript
// src/hooks/useDashboard.ts
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
    refetchInterval: 15000, // Poll every 15s
    staleTime: 10000, // Data is fresh for 10s
  });
};
```

### 2.2 Client State (Zustand)

Used for global UI state and synchronous data (e.g., Auth User, Sidebar Toggle).

**Why?**

- Minimal boilerplate compared to Redux.
- Simple hook-based API.

**Example: Auth Store**

```typescript
// src/store/authStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
```

---

## 3. Authentication Flow

Authentication is handled via **HttpOnly Cookies** (secure) rather than LocalStorage (vulnerable to XSS).

1.  **Login**: `useAuth.login()` calls `POST /api/auth/token/`.
2.  **Cookie Set**: Backend sets `access_token` and `refresh_token` cookies.
3.  **State Update**: Frontend updates `useAuthStore` with user details.
4.  **Interceptors**: `api/client.ts` automatically handles 401 errors:
    - Intercepts 401.
    - Calls `POST /api/auth/token/refresh/`.
    - Retries the original request.
    - Redirects to `/login` if refresh fails.

---

## 4. Real-Time Updates

We use **Smart Polling** for real-time features.

### 4.1 Dashboard Polling

The dashboard widgets (`ActiveTasksWidget`, `ProcessingStatusWidget`) automatically poll their respective endpoints every 10-15 seconds. This is configured via the `refetchInterval` option in React Query.

### 4.2 Async Task Tracking

When a document is uploaded, we receive a `task_id`. We use the `useTaskStatus` hook to poll the task status.

```typescript
// src/hooks/useTaskStatus.ts
const { data, isComplete } = useTaskStatus({
  taskId: "123-abc",
  enabled: true,
  onComplete: (result) => {
    toast.success("Document processed!");
    navigate(`/documents/${result.document_id}`);
  },
});
```

---

## 5. Styling & UI

- **Framework**: Tailwind CSS.
- **Icons**: Heroicons (via `@heroicons/react`).
- **Components**: We build custom components (`src/components/common`) rather than using a heavy UI library like MUI, to maintain full control over the design system.

**Common Pattern:**

```tsx
// Reusable Button Component
<button
  className={`
        px-4 py-2 rounded-md font-medium transition-colors
        ${
          variant === "primary"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : ""
        }
        ${
          variant === "secondary"
            ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
            : ""
        }
    `}
  {...props}
>
  {children}
</button>
```

---

## 6. Development Workflow

1.  **Start Dev Server**: `npm run dev` (Port 3000).
2.  **Linting**: `npm run lint` (ESLint).
3.  **Type Checking**: `npm run type-check` (TypeScript).
4.  **Testing**: `npm run test` (Vitest).

### Key Rules

- **No `any`**: Strictly define interfaces in `src/types/index.ts`.
- **No Inline Styles**: Use Tailwind classes.
- **Error Handling**: Always use `try/catch` in async functions or let React Query handle errors via `onError`.
