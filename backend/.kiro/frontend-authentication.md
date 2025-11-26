# Frontend JWT Authentication Documentation

## Overview

The P2P Procurement frontend implements robust JWT-based authentication using asymmetric RS256 algorithm with automatic token refresh, rotation handling, and seamless retry mechanisms.

## Backend JWT Configuration

### Algorithm: RS256 (Asymmetric)

**Key Pair:**

- **Private Key** (`backend/jwt_private.pem`): Used by Django to sign JWTs
- **Public Key** (`backend/jwt_public.pem`): Used for signature verification
  - also available in `frontend/src/config/jwt_public.pem` for client-side verification (if needed)

**Token Lifetimes:**

- Access Token: 60 minutes
- Refresh Token: 7 days

**Security Features:**

- ✅ Token Rotation: New refresh token issued on each refresh
- ✅ Blacklisting: Old refresh tokens invalidated after rotation
- ✅ RS256 Algorithm: Asymmetric signing prevents token forgery

**Django Settings** (`backend/src/config/settings/base.py`):

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'RS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,  # Private RSA key
    'VERIFYING_KEY': JWT_VERIFYING_KEY,  # Public RSA key
}
```

---

## Frontend Token Management

### Token Storage

**Location:** `localStorage`  
**Keys Stored:**

- `access_token`: JWT access token (60min validity)
- `refresh_token`: JWT refresh token (7 days validity, rotates on refresh)
- `user`: JSON-serialized user object (`{id, username, email, role}`)

**Alternative:** Consider `sessionStorage` for higher security (tokens cleared on tab close)

---

## Authentication Flow

### 1. Login Flow

```
User submits credentials
  ↓
POST /api/auth/token/
  ↓
Response: {access, refresh, user}
  ↓
Store tokens + user in localStorage
  ↓
Update Zustand auth state
  ↓
Navigate to role-based dashboard
```

**Implementation** (`store/authStore.ts`):

```typescript
login: async (username, password) => {
  const response = await authApi.login({ username, password });

  localStorage.setItem("access_token", response.access);
  localStorage.setItem("refresh_token", response.refresh);
  localStorage.setItem("user", JSON.stringify(response.user));

  set({ user: response.user, isAuthenticated: true });
};
```

---

### 2. Request Flow with Auto-Authentication

```
Component makes API request
  ↓
Axios request interceptor
  ↓
Attach Authorization: Bearer {access_token}
  ↓
Send to Django backend
  ↓
Response received
```

**Implementation** (`api/client.ts`):

```typescript
apiClient.interceptors.request.use((config) => {
  const access = localStorage.getItem("access_token");
  if (access && config.headers) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});
```

---

### 3. Token Refresh Flow (Reactive)

```
API request fails with 401 Unauthorized
  ↓
Response interceptor catches error
  ↓
POST /api/auth/token/refresh/ with {refresh}
  ↓
Response: {access, refresh}  ← NEW refresh token!
  ↓
Save NEW access_token
  ↓
✅ Save NEW refresh_token (CRITICAL!)
  ↓
Retry original request with new token
  ↓
Success
```

**Critical Implementation Detail** (`api/client.ts`):

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh_token");
      const refreshResponse = await axios.post("/auth/token/refresh/", {
        refresh,
      });

      const newAccess = refreshResponse.data.access;
      localStorage.setItem("access_token", newAccess);

      // ✅ CRITICAL: Save rotated refresh token
      if (refreshResponse.data.refresh) {
        localStorage.setItem("refresh_token", refreshResponse.data.refresh);
      }

      // Retry original request
      originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);
```

---

### 4. Token Rotation Handling

**Why Token Rotation?**

- **Security**: Old refresh tokens are immediately invalidated (blacklisted)
- **Prevents Replay Attacks**: Stolen tokens become useless after single use

**How It Works:**

1. User refreshes access token
2. Backend generates NEW refresh token
3. Backend blacklists OLD refresh token
4. Backend returns `{access: new_access, refresh: new_refresh}`
5. Frontend MUST save `new_refresh`, or next refresh fails

**Common Mistake (Fixed!):**

```typescript
// ❌ WRONG - Ignores rotated refresh token
localStorage.setItem("access_token", refreshResponse.data.access);
// Old refresh token now blacklisted, next refresh will fail!

// ✅ CORRECT - Saves rotated refresh token
localStorage.setItem("access_token", refreshResponse.data.access);
if (refreshResponse.data.refresh) {
  localStorage.setItem("refresh_token", refreshResponse.data.refresh);
}
```

---

### 5. Logout Flow

```
User clicks Logout
  ↓
authStore.logout()
  ↓
Clear all localStorage
  ↓
Reset Zustand state
  ↓
Navigate to /login
```

**Implementation:**

```typescript
logout: () => {
  localStorage.clear(); // Removes tokens + user
  set({ user: null, isAuthenticated: false });
};
```

---

## Error Handling

### Scenario 1: Access Token Expired

**Status:** 401 Unauthorized  
**Action:** Automatic token refresh → Retry request  
**User Impact:** None (transparent)

### Scenario 2: Refresh Token Expired

**Status:** 401 on `/token/refresh/`  
**Action:** Clear storage → Redirect to `/login`  
**User Impact:** Must re-authenticate

### Scenario 3: Refresh Token Blacklisted

**Cause:** Old refresh token used after rotation  
**Status:** 401 with blacklist error  
**Action:** Clear storage → Redirect to `/login`  
**User Impact:** Must re-authenticate  
**Prevention:** Always save rotated refresh token!

### Scenario 4: Network Failure During Refresh

**Status:** Network error  
**Action:** Reject promise → Component handles error  
**Fallback:** Reactive refresh will retry on next API call

---

## Security Considerations

### ✅ Implemented Security Features

1. **RS256 Asymmetric Algorithm**

   - Private key never leaves backend
   - Frontend can verify signatures with public key (optional)
   - Prevents token forgery

2. **Token Rotation**

   - Refresh tokens single-use
   - Old tokens blacklisted immediately
   - Reduces attack window

3. **Automatic Expiration**

   - Access: 60 min → Limits exposure if stolen
   - Refresh: 7 days → Balances security/UX

4. **Secure Transmission**

   - Tokens sent over HTTPS only (production)
   - `Authorization: Bearer` header (not cookies)

5. **XSS Protection**
   - React auto-escapes content
   - No `dangerouslySetInnerHTML` usage

### ⚠️ Security Considerations

1. **localStorage vs sessionStorage**

   - `localStorage`: Persists across tabs, survives browser restart
   - `sessionStorage`: Cleared on tab close, more secure but less convenient
   - **Recommendation**: Use `localStorage` for better UX, ensure HTTPS

2. **Token Exposure Risk**

   - localStorage accessible to all scripts on same origin
   - Mitigation: Strict CSP headers, avoid 3rd-party scripts

3. **Refresh Token Theft**
   - If refresh token stolen, attacker can generate access tokens for 7 days
   - Mitigation: Token rotation limits damage, user can logout to invalidate

---

## Integration With Components

### Accessing Auth State

```typescript
import { useAuthStore } from "@/store/authStore";

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  if (!isAuthenticated) return <Redirect to="/login" />;

  return <div>Welcome, {user.username}!</div>;
}
```

### Making Authenticated API Calls

```typescript
import { purchasesApi } from "@/api/purchasesApi";

// Automatic token attachment
const requests = await purchasesApi.getRequests();

// Automatic refresh if token expired
// No manual token handling needed!
```

### Role-Based Access

```typescript
<ProtectedRoute roles={["finance", "admin"]}>
  <OrdersList />
</ProtectedRoute>
```

### React Query Integration

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["requests"],
  queryFn: () => purchasesApi.getRequests(),
});

// Token refresh handled transparently
// Queries automatically retry after refresh
```

---

## Testing

### Manual Test: Token Rotation

1. Login successfully
2. Open DevTools → Application → Local Storage
3. Copy current `refresh_token` value
4. Wait 60 minutes or force token expiration
5. Make any API call
6. Check Network tab: `/auth/token/refresh/` request
7. Check Local Storage: `refresh_token` should be DIFFERENT
8. Verify app continues working

**Expected:** New refresh token replaces old one ✅

### Manual Test: Blacklisted Token

1. Login and copy `refresh_token`
2. Trigger a refresh (wait or force)
3. Try using OLD refresh token manually:
   ```bash
   curl -X POST http://localhost:8000/api/auth/token/refresh/ \
     -H "Content-Type: application/json" \
     -d '{"refresh": "OLD_TOKEN"}'
   ```
4. Verify: 401 error with blacklist message

**Expected:** Old token rejected ✅

---

## Troubleshooting

### Issue: "Token is blacklisted"

**Cause:** Frontend not saving rotated refresh token  
**Fix:** Ensure `client.ts` saves `refreshResponse.data.refresh`  
**Status:** ✅ Fixed in latest implementation

### Issue: Forced logout every hour

**Cause:** Token refresh failing silently  
**Debug:** Check browser console for refresh errors  
**Fix:** Verify backend `/token/refresh/` endpoint works

### Issue: CORS errors on token refresh

**Cause:** Backend not allowing refresh endpoint  
**Fix:** Ensure `corsheaders.middleware.CorsMiddleware` configured

---

## Production Deployment

### Environment Variables

```env
# Frontend .env
VITE_API_BASE_URL=https://api.yourcompany.com/api
```

### Backend Checklist

- [ ] RSA keys generated (`jwt_private.pem`, `jwt_public.pem`)
- [ ] `jwt_private.pem` in `.gitignore`
- [ ] Environment-specific settings override `base.py` if needed
- [ ] HTTPS enforced for production
- [ ] CORS configured for frontend domain

### Frontend Checklist

- [ ] `jwt_public.pem` copied to `src/config/`
- [ ] API_BASE_URL points to production backend
- [ ] Token rotation fix deployed
- [ ] Error logging configured

---

## Summary

**Implementation Status:**

- ✅ RS256 asymmetric JWT
- ✅ Token rotation handling
- ✅ Automatic token refresh
- ✅ Request retry after refresh
- ✅ Blacklisting protection
- ✅ Role-based access control
- ✅ Secure token storage

**Key Files:**

- `backend/jwt_private.pem` - Never commit!
- `backend/jwt_public.pem` - Safe to share
- `frontend/src/api/client.ts` - Token refresh logic
- `frontend/src/store/authStore.ts` - Auth state management
- `backend/src/config/settings/base.py` - JWT configuration

**Security Level:** Production-ready with industry best practices ✅

---

**Last Updated:** 2025-11-22  
**Version:** 2.0 (RS256 with Token Rotation)
