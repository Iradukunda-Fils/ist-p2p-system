# Frontend Setup & Troubleshooting Guide

## Prerequisites

### 1. Install Node.js
Download and install Node.js **18 or higher** from: https://nodejs.org/

**Verify Installation**:
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

---

## Initial Setup

### Step 1: Navigate to Frontend Directory
```bash
cd c:\Lost\Infra\frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

**Expected output**: Should install ~500MB of `node_modules/`

### Step 3: Create .env File
The `.env` file already exists with correct configuration:
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=P2P Procurement System
```

**✅ This is already configured correctly!**

### Step 4: Start Development Server
```bash
npm run dev
```

**Expected output**:
```
VITE v5.0.4  ready in 500 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

---

## Common Issues & Solutions

### Issue 1: "npm is not recognized"

**Problem**: Node.js not installed or not in PATH

**Solution**:
1. Download Node.js from https://nodejs.org/ (LTS version recommended)
2. Run installer and **restart terminal**
3. Verify: `node --version`

---

### Issue 2: "Cannot find module '@/types'"

**Problem**: TypeScript path aliases not working

**Solution**: Already fixed in `vite.config.ts` and `tsconfig.json`. If still occurring:

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 3: Port 3000 Already in Use

**Problem**: Another app running on port 3000

**Solution**:
```bash
# Option 1: Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Use different port
npm run dev -- --port 3001
```

---

### Issue 4: "Failed to resolve entry"

**Problem**: Missing `main.tsx` or incorrect paths

**Solution**: Verify files exist:
```
src/
├── main.tsx     ✓
├── App.tsx      ✓
└── index.css    ✓
```

All files are present, this should not occur.

---

### Issue 5: TypeScript Errors

**Problem**: Type checking fails

**Solution**:
```bash
# Check for errors
npm run build

# If errors persist, check tsconfig.json is correct
```

---

### Issue 6: Backend Connection Error

**Problem**: API calls failing with CORS or connection errors

**Checklist**:
1. ✅ Backend running on `http://localhost:8000`
2. ✅ `.env` has `VITE_API_BASE_URL=http://localhost:8000/api`
3. ✅ Backend CORS configured to allow `http://localhost:3000`

**Test Backend**:
```bash
curl http://localhost:8000/api/
```

---

### Issue 7: "Module not found" Errors

**Problem**: Missing dependencies

**Solution**:
```bash
# Reinstall all dependencies
npm install

# If specific package missing:
npm install <package-name>
```

**All required packages are in `package.json`**

---

## Verification Checklist

Before running, ensure:

- [ ] Node.js 18+ installed
- [ ] In `frontend/` directory
- [ ] `npm install` completed successfully
- [ ] `.env` file exists
- [ ] Port 3000 available
- [ ] Backend running (optional for UI testing)

---

## Step-by-Step Fresh Start

If nothing works, start completely fresh:

```bash
# 1. Navigate to frontend
cd c:\Lost\Infra\frontend

# 2. Remove old installations
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 3. Clean npm cache
npm cache clean --force

# 4. Install fresh
npm install

# 5. Start dev server
npm run dev
```

---

## Manual Dependency Installation

If `npm install` fails, install key packages manually:

```bash
# Core
npm install react@18.2.0 react-dom@18.2.0

# Routing
npm install react-router-dom@6.20.0

# HTTP & State
npm install axios@1.6.2 zustand@4.4.7 @tanstack/react-query@5.12.2

# Forms & UI
npm install react-hook-form@7.48.2 react-toastify@9.1.3 clsx@2.0.0 date-fns@2.30.0

# Dev Dependencies
npm install -D vite@5.0.4 @vitejs/plugin-react@4.2.1 typescript@5.3.3
npm install -D tailwindcss@3.3.6 autoprefixer@10.4.16 postcss@8.4.32
npm install -D @types/react@18.2.43 @types/react-dom@18.2.17 @types/node@20.10.4
```

---

## Build for Production

Once development works:

```bash
npm run build
```

Output will be in `dist/` folder.

---

## Testing Without Backend

The frontend can run without the backend, but:
- Login will fail (no API)
- Data fetching will fail
- Use browser dev tools to see errors

**Mock Testing**:
- Navigate directly to pages
- Test UI components
- Verify responsiveness

---

## Environment Variables Explained

```env
VITE_API_BASE_URL=http://localhost:8000/api
# This is where your Django backend is running
# Change to production URL when deploying

VITE_APP_NAME=P2P Procurement System
# App name shown in header
```

---

## File Structure Validation

Ensure these files exist:

```
frontend/
├── node_modules/        (after npm install)
├── public/
├── src/
│   ├── api/            ✓ 4 files
│   ├── components/     ✓ 10 files
│   ├── pages/          ✓ 8 files
│   ├── routes/         ✓ 2 files
│   ├── store/          ✓ 1 file
│   ├── types/          ✓ 1 file
│   ├── utils/          ✓ 2 files
│   ├── App.tsx         ✓
│   ├── main.tsx        ✓
│   └── index.css       ✓
├── .env                ✓
├── index.html          ✓
├── package.json        ✓
├── tsconfig.json       ✓
├── vite.config.ts      ✓
└── tailwind.config.js  ✓
```

**All files are present!** ✅

---

## Quick Start Commands

```bash
# Install (one time)
cd c:\Lost\Infra\frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Getting Help

If issues persist:

1. Check browser console for errors (F12)
2. Check terminal output for error messages
3. Verify Node.js version: `node --version`
4. Check if port is available: `netstat -ano | findstr :3000`

---

## Success Indicators

When everything works correctly:

✅ Terminal shows: `VITE v5.0.4  ready in XX ms`  
✅ Browser opens `http://localhost:3000`  
✅ Login page appears  
✅ No console errors (red text in browser dev tools)

---

**Next Step**: Run `npm install` then `npm run dev`
