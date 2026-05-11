# PropPreserve — Complete Feature Specification

---

## 1. MESSAGING SYSTEM

### 1.1 Task-Level Messaging
- Chat tied to individual tasks within a work order
- Attach images to messages
- Message notifications with sound alerts
- Read receipts (who read, when)
- Urgency flags
- Message pinning

### 1.2 Work Order-Level Messaging
- Dedicated chat thread per work order
- All work order messages viewable on a single page
- AI assistant embedded in each thread (see AI section)
- Message types: Comment, System, Revision, Client Update, QC, Bid, Inspection, Accounting, Task, Poll
- Message templates:
  - Revision Request
  - Client Update
  - Assignment Note
  - QC Feedback
  - Accounting Note

### 1.3 General Chat (Slack-Like)
- Channel-based real-time messaging
- Direct messages between users
- Threaded replies
- File & image sharing
- Search across all conversations
- @mentions and notifications
- Message reactions (emoji)

### 1.4 Client Messaging System
- Client-specific messaging channels
- Clients can message coordinators and support
- Read/unread status tracking

### 1.5 All Work Orders Messages — Single Page View
- Aggregate all messages across all work orders on one page
- Filter by work order, user, date, message type
- Quick reply inline

---

## 2. AI FEATURES

### 2.1 AI Chat Assistant (Context-Aware)
- Ask anything about:
  - Work order history & status
  - Property history
  - Conversation history
  - Call history
  - Summarize work order
  - Summarize property history
  - Overall updates & trends
- **Access control:**
  - Admin → full access to all data
  - Other roles → access based on work order assignment or client assignment
- Work order-level AI chat — AI has stored context for that specific order and can answer questions about it

### 2.2 AI Contractor/Job Candidate Finder
- Finds contractors or job candidates in the target area based on job type
- Can call, send message, or email candidates directly
- Considers contractor ratings, availability, proximity

### 2.3 AI Calling Assistance
- Talks with contractors & clients using coordinator's cloned voice
- Schedule-based calling (auto-dial at set times)
- Contractors can call the AI assistant directly via the app
- Call logging and transcription

### 2.4 AI Auto Text Messaging
- Auto-messages contractors based on:
  - Current work order status
  - Due dates and approaching deadlines
  - Unread messages → notifies client, assigned coordinator, contractor
  - Pending orders → notifies relevant parties
  - Pending issues → auto-messages admin

### 2.5 AI Auto-Bid Completion
- Not from presets — from specific inputs:
  - Order type, location, costs, labor hours, materials, reason
- AI generates a polished, professional bid from even a small note
- Precise and formatted output

### 2.6 AI-Powered Image Search
- Search photos by description across the system
- "Find all lockbox photos" → returns matching images
- Interoperated across all uploaded files

### 2.7 AI Calling on Messaging System
- Initiate AI-assisted calls directly from the messaging interface

---

## 3. COMMUNICATION — EMAIL

### 3.1 Built-In Email Client
- Send and receive emails within the app
- Read incoming emails
- Email integration with work orders

### 3.2 AI Email Analysis (Scorecard)
- Analyzes incoming/outgoing emails
- Generates business scorecard:
  - How the business is performing
  - Trends vs. previous data
  - Performance metrics derived from email activity

---

## 4. WORK ORDERS

### 4.1 Work Order Lifecycle
- Statuses: NEW → PENDING → ASSIGNED → IN_PROGRESS → FIELD_COMPLETE → QC_REVIEW → REVISIONS_NEEDED → OFFICE_COMPLETE → CLOSED → CANCELLED
- Service types: Grass Cut, Debris Removal, Winterization, Board-Up, Inspection, Mold Remediation, Other

### 4.2 Work Order Compliance (Contractor View)
- When contractor opens a work order, compliance checklist displays:
  - Lock change: before, during, after photos
  - Key code photos
  - Key code inside lockbox
  - Lockbox code
  - All required documentation items per service type

### 4.3 Work Order Views/Finders
| Finder | Description |
|--------|-------------|
| Property-Based | Click a property → see all work orders for that property |
| Processor-Based | Filter by processor assignment |
| Contractor-Based | Filter by contractor assignment |
| Coordinator-Based | Filter by coordinator assignment |
| Service Catalog-Based | Filter by work order type/service |
| Search by Task Description | Search within task completion descriptions |

### 4.4 Bulk Operations
- Bulk assign work orders
- Bulk status update
- Bulk export
- Bulk print

### 4.5 Work Order Status Categories (Dashboard)
- New
- Assigned
- In Progress
- Field Complete
- QC Review
- Pending Review
- Revisions Needed
- Office Complete
- Closed
- Cancelled
- **Assets** (new status category)

---

## 5. DASHBOARD

### 5.1 Work Order Status Overview
- Count of work orders in each status
- Visual cards with counts and quick links

### 5.2 User Performance Metrics
| Metric | Description |
|--------|-------------|
| Working Hours | Hours logged by user |
| Work Orders Processed | Count completed |
| Total Client Invoice | Revenue from invoices |
| Total Profit | Net profit calculation |
| Contractor Working Hours | Hours logged by contractor |
| Work Orders Done | Count by contractor |
| Total Own Payment | Payments made to contractor |
| Number of Payments | Payment count |
| Total Money Earned (Vendor) | Vendor earnings summary |

---

## 6. COORDINATOR PROFILE
- Display coordinator's:
  - Photo
  - Name
  - Cell phone number
  - Email
  - **"Call" button** — one-tap to call

---

## 7. VENDOR / CONTRACTOR MANAGEMENT

### 7.1 Vendor Matrix
| Field | Description |
|-------|-------------|
| Photo | Profile picture |
| Rating | Performance rating |
| Area | Service area / coverage |
| Active Orders | Currently assigned work orders |
| Efficiency | Completion speed metric |
| Accuracy | QC pass rate |
| Core Capacities | Service types they can handle |

### 7.2 Contractor Directory
- Includes third-party professionals (plumbers, electricians, etc.)
- Google Maps integration for location-based lookup
- Filter by service type, area, rating, availability

### 7.3 Notifications
- Contractors receive notifications for:
  - Cancelled work orders
  - Due work orders
  - Overdue work orders

---

## 8. INVOICING & ACCOUNTING

### 8.1 Invoice Structure
- Contractor invoice costs (labor)
- Material costs
- **Client profit** per work order
- **Profit per property** (aggregate across all work orders)
- **Profit per work order**
- Chargebacks

### 8.2 Accounting Module
- Atlas Console-style accountant-to-admin communication
- Financial reporting
- Cost breakdowns

---

## 9. ASSET INVENTORY

- Property inventory with front home photos
- Click property → opens all work orders for that property
- Property metadata and history

---

## 10. TRAINING AREA

- Document library (PDFs, guides)
- Video training content
- Zoom integration (training link / Zoom panel)
- Udemy-style training panel
- Progress tracking

---

## 11. LOGISTICS & SUPPLY CHAIN

- Supply chain management
- Material tracking
- Logistics coordination

---

## 12. INSPECTION TEAM

- Inspection team directory with details
- Google Maps integration
- Find local professionals:
  - Plumbers
  - Electricians
  - General contractors
  - Other specialists
- Map view with proximity search

---

## 13. CLIENT PORTAL

### 13.1 Client Dashboard
- View accessible content:
  - Work order status
  - Invoice status
  - Messages
  - Reports

### 13.2 Client Login
- Dedicated client login
- Role-based content filtering (only sees their own data)

---

## 14. NOTIFICATIONS

### 14.1 Notification Types
- Message notifications (with sound)
- Work order status changes
- Due/overdue reminders
- Cancelled work order alerts
- Pending order alerts
- Pending issue alerts (to admin)
- AI-generated auto-notifications

### 14.2 Notification Page
- Central notification center
- Mark as read/unread
- Filter by type

### 14.3 Custom Notification Settings
- Per-user notification preferences
- Toggle notification types on/off
- Channel preferences (in-app, email, SMS)

---

## 15. MESSAGE TEMPLATES

| Template | Purpose |
|----------|---------|
| Revision Request | Request contractor to revise work |
| Client Update | Status update to client |
| Assignment Note | Work order assignment details |
| QC Feedback | Quality control feedback |
| Accounting Note | Financial note or adjustment |

---

## 16. AI-POWERED IMAGE SEARCH
- Search uploaded photos by natural language description
- "Show me all photos of broken windows at 123 Main St"
- Cross-references all file uploads in the system

---

## 17. REPORTS & ANALYTICS
- Business performance scorecard
- Revenue trends (current vs. previous)
- Contractor efficiency reports
- Property-level profitability
- Work order completion rates
- Email-derived business insights

---

## 18. ADMIN CONTROLS
- User management (CRUD, role assignment)
- Property database management
- Contractor network management
- Financial overview & billing
- Full access to all AI features
- System-wide configuration
- Audit trails and activity logs

---

## SUMMARY: FEATURE COUNT BY CATEGORY

| Category | Feature Count |
|----------|:------------:|
| Messaging | 5 subsections |
| AI Features | 7 capabilities |
| Email | 2 subsections |
| Work Orders | 5 subsections |
| Dashboard | 2 subsections |
| Coordinator Profile | 1 |
| Vendor/Contractor | 3 subsections |
| Invoicing & Accounting | 2 subsections |
| Asset Inventory | 1 |
| Training | 1 |
| Logistics | 1 |
| Inspection Team | 1 |
| Client Portal | 2 subsections |
| Notifications | 3 subsections |
| Message Templates | 1 |
| AI Image Search | 1 |
| Reports | 1 |
| Admin Controls | 1 |
| **Total** | **38 feature areas** |
