# Pages and User Flows Documentation

## Overview

This document details all application pages, their routing, user flows, and interactions in the P2P Procurement System frontend.

## Route Mapping

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/login` | Login | Public | Authentication page |
| `/` | Redirect | Any | Redirects to `/dashboard` |
| `/dashboard` | Dashboard | Protected | Role-based dashboard |
| `/requests` | RequestsList | Protected | All purchase requests |
| `/requests/create` | CreateRequest | Staff/Admin | Create new request |
| `/requests/:id` | RequestDetail | Protected | Request details & approval |
| `/orders` | OrdersList | Finance/Admin | Purchase orders list |
| `/orders/:id` | OrderDetail | Finance/Admin | PO details |

---

## Page Details

### 1. Login Page

**Route**: `/login`  
**Access**: Public  
**Component**: `pages/auth/Login.tsx`

**Purpose**: User authentication

**Features**:
- Username/password form
- Form validation
- Loading state during login
- Error display
- Redirect to original destination

**Flow**:
```
User enters credentials
  ↓
Submits form
  ↓
API call to /auth/token/
  ↓
Success → Store tokens → Navigate to dashboard
  ↓
Error → Display error message
```

**UI Elements**:
- App logo/title
- Username input
- Password input
- Sign in button
- Error toast

---

### 2. Dashboard

**Route**: `/dashboard`  
**Access**: All authenticated users  
**Component**: `pages/dashboard/StaffDashboard.tsx`

**Purpose**: Central hub with role-specific widgets

**Features**:
- Role-specific stats cards
- Quick action buttons
- Recent requests table
- PO summary (finance only)

**Role-Based Content**:

**Staff View**:
- My Requests count
- Pending requests count
- Create Request button
- My recent requests

**Approver View**:
- Pending Approvals count
- Approved Today count
- Approval queue
- Quick approve actions

**Finance View**:
- Total POs count
- Total PO value
- PO status breakdown
- View Orders button

**Flow**:
```
User logs in
  ↓
Check user role
  ↓
Load role-specific data
  ↓
Display appropriate widgets
  ↓
User clicks quick action → Navigate to relevant page
```

---

### 3. Requests List

**Route**: `/requests`  
**Access**: All authenticated users  
**Component**: `pages/requests/RequestsList.tsx`

**Purpose**: Browse and filter all purchase requests

**Features**:
- Search by title/description
- Filter by status
- Sortable table
- Pagination
- Create Request button (staff only)
- View Details action

**Table Columns**:
1. Title (with item count)
2. Amount
3. Status (badge)
4. Created By
5. Created Date
6. Actions

**Flow**:
```
Page loads
  ↓
Fetch requests with filters
  ↓
Display in table
  ↓
User applies filter → Refetch
  ↓
User clicks row → Navigate to detail
```

**Filters**:
- Search: Text search in title/description
- Status: PENDING | APPROVED | REJECTED | All

---

### 4. Create Request

**Route**: `/requests/create`  
**Access**: Staff & Admin only  
**Component**: `pages/requests/CreateRequest.tsx`

**Purpose**: Create new purchase request

**Features**:
- Multi-section form
- Dynamic items array
- Real-time total calculation
- Form validation
- Add/remove items

**Form Sections**:

**1. Basic Information**:
- Title (required)
- Description (optional)

**2. Items** (dynamic array):
- Item name (required)
- Quantity (required, min: 1)
- Unit price (required, min: 0.01)
- Unit of measure (optional)
- Auto-calculated line total
- Add/Remove item buttons

**3. Summary**:
- Display total amount
- Cancel button
- Create button

**Flow**:
```
User fills basic info
  ↓
Adds items one by one
  ↓
Total calculates automatically
  ↓
Submits form
  ↓
Validation passes → API call
  ↓
Success → Navigate to request detail
  ↓
Error → Display validation errors
```

**Validation Rules**:
- Title: Required
- Items: At least one required
- Quantity: Min 1
- Unit Price: Min 0.01

---

### 5. Request Detail

**Route**: `/requests/:id`  
**Access**: All authenticated users  
**Component**: `pages/requests/RequestDetail.tsx`

**Purpose**: View request details and manage approvals

**Features**:
- Request information card
- Items table
- Approval history timeline
- Approve/Reject buttons (approvers only)
- Status badge
- Back to list navigation

**Information Displayed**:
- Request ID
- Title & Description
- Total Amount
- Status
- Created by & date
- Items with quantities and prices
- Full approval timeline

**Approval Actions** (conditional):

**Show when**:
- Request status is PENDING
- User is approver level 1 or 2
- User hasn't already approved

**Approve Modal**:
- Comment input (optional)
- Confirm button
- Determines level based on amount and user role

**Reject Modal**:
- Reason input (required)
- Confirm button

**Flow**:
```
Page loads with request ID
  ↓
Fetch request details
  ↓
Display information
  ↓
[If approver] Show action buttons
  ↓
User clicks Approve/Reject
  ↓
Modal opens
  ↓
User enters comment
  ↓
Submits → API call
  ↓
Success → Refresh data → Show toast
  ↓
Request status updates
```

**Approval Timeline**:
- Chronological list of approvals
- Approved (green check) vs Rejected (red X)
- Approver name
- Level (1 or 2)
- Timestamp
- Comment (if any)

---

### 6. Orders List

**Route**: `/orders`  
**Access**: Finance & Admin only  
**Component**: `pages/orders/OrdersList.tsx`

**Purpose**: Manage purchase orders

**Features**:
- Search by PO number or vendor
- Filter by status
- Table display
- View Details action

**Table Columns**:
1. PO Number
2. Vendor
3. Total Amount
4. Status
5. Created Date
6. Actions

**Flow**:
```
Finance user navigates to orders
  ↓
Fetch POs with filters
  ↓
Display in table
  ↓
User filters → Refetch
  ↓
User clicks row → Navigate to detail
```

**Filters**:
- Search: PO number or vendor name
- Status: DRAFT | SENT | ACKNOWLEDGED | FULFILLED | All

---

### 7. Order Detail

**Route**: `/orders/:id`  
**Access**: Finance & Admin only  
**Component**: `pages/orders/OrderDetail.tsx`

**Purpose**: View PO details and generate PDF

**Features**:
- PO information card
- Vendor details
- Items table
- Related request link
- Generate PDF button
- Terms & conditions

**Information Displayed**:
- PO Number
- Status
- Vendor name & contact
- Total amount
- Created date
- All items with prices
- Payment & delivery terms
- Link to original request

**Flow**:
```
Page loads with PO ID
  ↓
Fetch order details
  ↓
Display information
  ↓
User clicks Generate PDF
  ↓
API call to generate
  ↓
Success → Show toast
  ↓
User can download PDF
```

---

## User Flows

### Complete Procurement Flow

```
1. Staff Creates Request
   /requests/create
   ↓
2. Request Submitted
   Navigate to /requests/:id
   ↓
3. Approver Reviews
   /requests → Click request → /requests/:id
   ↓
4. Approver Approves (Level 1)
   Modal → Submit → Refresh
   ↓
5. [If >$1000] Approver Level 2 Approves
   Modal → Submit → Refresh
   ↓
6. PO Auto-Generated
   Backend creates PO
   ↓
7. Finance Views PO
   /orders → Click order → /orders/:id
   ↓
8. Finance Generates PDF
   Click button → PDF ready
```

### Approval Workflow

```
Request Status: PENDING
  ↓
Amount ≤ $1,000 → Requires Level 1
  ↓
  Approver Level 1 approves
  ↓
  Status → APPROVED
  ↓
  PO generated

Amount > $1,000 → Requires Level 1 + Level 2
  ↓
  Approver Level 1 approves
  ↓
  Status → Still PENDING
  ↓
  Approver Level 2 approves
  ↓
  Status → APPROVED
  ↓
  PO generated
```

### Rejection Flow

```
Request Status: PENDING
  ↓
Any approver clicks Reject
  ↓
Enters required reason
  ↓
Submits
  ↓
Status → REJECTED
  ↓
Workflow terminates (No PO)
```

---

## Navigation Patterns

### Header Navigation

Always visible when authenticated:
- Logo → /dashboard
- Dashboard → /dashboard
- Requests → /requests
- Orders → /orders (finance only)
- User menu → Logout

### Breadcrumbs

- Requests pages: ← Back to Requests
- Orders pages: ← Back to Orders

### Context Actions

- Dashboard: Quick action buttons
- List pages: Create/Filter buttons
- Detail pages: Approve/Reject/Generate PDF

---

## Responsive Design

All pages are responsive:
- Mobile: Stacked layouts, hidden columns
- Tablet: 2-column grids
- Desktop: Full layout with all columns

---

**Total Pages**: 7 functional pages  
**User Flows**: Complete procurement cycle  
**Role-Based**: Yes (3 role variations)
