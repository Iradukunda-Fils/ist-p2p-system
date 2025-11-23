# User Guide

This guide explains how to use the P2P Procurement System for different user roles.

## Getting Started

### Logging In

1. Navigate to the application URL (e.g., http://localhost or your domain)
2. Enter your username and password
3. Click "Sign In"

Your session will remain active across browser tabs and will automatically refresh when needed.

### Dashboard Overview

After logging in, you'll see the dashboard with:
- **Quick Stats**: Summary of requests and orders relevant to your role
- **Latest Requests**: Recent purchase requests requiring your attention
- **Quick Actions**: Common tasks based on your permissions

## User Roles and Permissions

### Staff Users
**What you can do:**
- Create new purchase requests
- View and edit your own requests (before approval)
- Submit receipts for completed orders
- Track the status of your requests

### Approver Level 1
**What you can do:**
- Everything a staff user can do
- Approve or reject requests up to $1,000
- View requests assigned to you for approval
- Add comments when approving/rejecting

### Approver Level 2
**What you can do:**
- Everything an Approver Level 1 can do
- Approve or reject requests of any amount
- Handle escalated requests from Level 1

### Finance Team
**What you can do:**
- View all purchase requests and orders
- Generate purchase orders from approved requests
- Download PO PDFs
- Manage vendor information
- Process receipts and invoices

### Admin Users
**What you can do:**
- Full system access
- User management
- System configuration
- View all data and reports

## Creating Purchase Requests

### Step 1: Navigate to Create Request
1. Click "Create Request" from the dashboard or navigation menu
2. You'll see the purchase request form

### Step 2: Fill in Request Details
**Basic Information:**
- **Title**: Brief description of what you're purchasing
- **Description**: Detailed explanation of the business need
- **Justification**: Why this purchase is necessary

**Example:**
```
Title: Monthly Office Supplies
Description: Restocking printer paper, pens, and other office essentials for the marketing team
Justification: Current supplies are running low and needed for daily operations
```

### Step 3: Add Items
For each item you need:
1. Click "Add Item"
2. Fill in:
   - **Description**: What you're buying
   - **Quantity**: How many units
   - **Unit Price**: Price per unit (if known)

**Example Items:**
```
Item 1:
- Description: Printer Paper (500 sheets)
- Quantity: 10
- Unit Price: $5.00

Item 2:
- Description: Blue Ballpoint Pens
- Quantity: 20
- Unit Price: $1.50
```

### Step 4: Review and Submit
1. Review all information for accuracy
2. Check the calculated total amount
3. Click "Submit Request"

Your request will be sent to the appropriate approver based on the total amount.

## Managing Your Requests

### Viewing Your Requests
1. Go to "My Requests" from the navigation menu
2. You'll see a list of all your requests with:
   - Status (Pending, Approved, Rejected)
   - Total amount
   - Creation date
   - Current approver (if applicable)

### Request Statuses
- **Draft**: Request saved but not submitted
- **Pending**: Submitted and awaiting approval
- **Approved**: Approved and ready for purchase order creation
- **Rejected**: Rejected with comments from approver
- **Ordered**: Purchase order created
- **Completed**: Order fulfilled and closed

### Editing Requests
You can edit requests that are in "Draft" or "Pending" status:
1. Click on the request title
2. Click "Edit Request"
3. Make your changes
4. Click "Update Request"

**Note**: Once approved, requests cannot be edited.

## Approval Process

### For Approvers: Reviewing Requests

#### Step 1: Access Pending Approvals
1. Go to "Pending Approvals" from your dashboard
2. You'll see requests waiting for your approval

#### Step 2: Review Request Details
1. Click on a request to view full details
2. Review:
   - Business justification
   - Item details and pricing
   - Total amount
   - Requester information

#### Step 3: Make Decision
**To Approve:**
1. Click "Approve"
2. Add optional comments
3. Click "Confirm Approval"

**To Reject:**
1. Click "Reject"
2. Add required comments explaining why
3. Click "Confirm Rejection"

### Approval Workflow
1. **Requests ≤ $1,000**: Go to Level 1 Approver
2. **Requests > $1,000**: Go to Level 2 Approver
3. **Approved requests**: Automatically sent to Finance for PO creation
4. **Rejected requests**: Returned to requester with comments

## Purchase Orders (Finance Team)

### Creating Purchase Orders
1. Go to "Approved Requests"
2. Click on an approved request
3. Click "Create Purchase Order"
4. Fill in vendor information:
   - Vendor name
   - Contact details
   - Payment terms
5. Review items and pricing
6. Click "Generate PO"

### Managing Purchase Orders
1. Go to "Purchase Orders" to view all POs
2. Filter by status: Pending, Sent, Received, Completed
3. Click on a PO to view details

### Generating PO PDFs
1. Open a purchase order
2. Click "Download PDF"
3. The PDF will include:
   - PO number
   - Vendor details
   - Item list with quantities and prices
   - Terms and conditions

## Document Management

### Uploading Documents
You can upload supporting documents for requests:
1. Open a purchase request
2. Click "Upload Document"
3. Select file type:
   - **Proforma Invoice**: Vendor quote
   - **Receipt**: Proof of purchase
   - **Invoice**: Vendor bill
4. Choose file and upload

### Supported File Types
- PDF documents
- Images (JPG, PNG)
- Maximum file size: 10MB

### Document Processing
The system automatically processes uploaded documents:
- **OCR Text Extraction**: Extracts text from images and PDFs
- **Data Recognition**: Identifies vendor names, amounts, and items
- **Validation**: Compares extracted data with request details

## Notifications and Updates

### Email Notifications
You'll receive email notifications for:
- Request status changes
- New requests requiring your approval
- Purchase orders ready for processing
- System updates and maintenance

### In-App Notifications
Check the notification bell icon for:
- Real-time updates
- Action items requiring attention
- System messages

## Search and Filtering

### Finding Requests
Use the search and filter options:
- **Search**: Enter keywords to find requests by title or description
- **Status Filter**: Show only pending, approved, or rejected requests
- **Date Range**: Filter by creation or update date
- **Amount Range**: Filter by total amount

### Sorting Options
Sort requests by:
- Creation date (newest/oldest first)
- Total amount (highest/lowest first)
- Status
- Requester name

## Reports and Analytics

### Dashboard Statistics
Your dashboard shows:
- Total requests this month
- Pending approvals
- Average approval time
- Total spending

### Exporting Data
Export request data:
1. Go to the requests list
2. Apply desired filters
3. Click "Export to CSV"
4. Download the file

## Mobile Usage

### Responsive Design
The system works on mobile devices:
- Responsive layout adapts to screen size
- Touch-friendly buttons and forms
- Optimized for tablets and phones

### Mobile Features
- View and approve requests on the go
- Upload photos of receipts
- Receive push notifications (if enabled)

## Troubleshooting

### Common Issues

#### Can't Log In
- Check username and password
- Ensure Caps Lock is off
- Contact your administrator if account is locked

#### Request Won't Submit
- Check all required fields are filled
- Ensure at least one item is added
- Verify total amount is calculated

#### Upload Failed
- Check file size (max 10MB)
- Ensure file type is supported (PDF, JPG, PNG)
- Try a different browser if issues persist

#### Page Won't Load
- Refresh the page
- Clear browser cache
- Check internet connection
- Contact IT support if problem continues

### Getting Help

#### In-App Help
- Look for the "?" icon next to form fields
- Check tooltips for additional guidance
- Use the help section in the navigation menu

#### Contact Support
- **Email**: support@yourcompany.com
- **Phone**: Your IT helpdesk number
- **Internal Chat**: Use your company's chat system

## Best Practices

### Creating Effective Requests
1. **Be Specific**: Provide detailed item descriptions
2. **Include Justification**: Explain the business need clearly
3. **Research Pricing**: Include estimated costs when possible
4. **Plan Ahead**: Submit requests with adequate lead time

### For Approvers
1. **Review Thoroughly**: Check all details before approving
2. **Provide Feedback**: Add helpful comments when rejecting
3. **Act Promptly**: Process requests in a timely manner
4. **Ask Questions**: Contact requester if clarification needed

### Document Management
1. **Upload Supporting Documents**: Include quotes and specifications
2. **Use Clear Filenames**: Name files descriptively
3. **Keep Receipts**: Upload receipts promptly after purchase
4. **Organize Files**: Use consistent naming conventions

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:
- **Ctrl+N**: Create new request
- **Ctrl+S**: Save draft
- **Enter**: Submit form
- **Esc**: Close modal dialogs
- **Tab**: Navigate between form fields

---

**This user guide helps you make the most of the P2P Procurement System. For additional help, contact your system administrator.** 📖