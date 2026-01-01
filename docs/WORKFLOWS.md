# User Workflows Documentation

Complete workflow documentation for all 10 user roles in the system.

## Role Overview

The platform supports 10 distinct roles across three operational domains:

### Business Operations (7 roles)
1. Infrastructure Owner
2. Business Owner
3. Manager
4. Warehouse
5. Dispatcher
6. Sales
7. Customer Service

### Delivery Operations (1 role)
8. Driver

### Customer Operations (2 roles)
9. Customer
10. User (Guest)

---

## Global Entry Flow (All Roles)

Every user follows this initial flow:

### 1. Application Launch
- Detect device type (mobile/desktop)
- Check for existing session in LocalStorage
- If session exists → validate and load role
- If no session → redirect to login

### 2. Login Page
- Display wallet connection options:
  - Ethereum (MetaMask, WalletConnect)
  - Solana (Phantom, Solflare)
  - TON Connect
- User selects wallet and connects
- Wallet signs authentication message
- Session created and persisted
- Role loaded from IndexedDB

### 3. Role Router
After successful authentication, route to appropriate shell:

| Role | Shell | Landing Page |
|------|-------|-------------|
| infrastructure_owner | AdminShell | Infrastructure Dashboard |
| business_owner | BusinessShell | Business Dashboard |
| manager | BusinessShell | Manager Dashboard |
| warehouse | BusinessShell | Warehouse Dashboard |
| dispatcher | BusinessShell | Dispatch Console |
| sales | BusinessShell | Sales CRM |
| customer_service | BusinessShell | Support Console |
| driver | DriverShell | Driver Home |
| customer | StoreShell | Catalog |
| user (guest) | StoreShell | Catalog |

---

## Role-Specific Workflows

---

## 1. Infrastructure Owner Workflow

**Purpose**: Platform-wide administration and oversight

### Home Screen: Infrastructure Dashboard

**Key Metrics Displayed**:
- Total active businesses
- Total registered drivers
- Platform-wide order count
- System health indicators
- Recent activity log

### Primary Navigation

#### Manage Businesses
**Path**: `/admin/businesses`

**Workflow**:
1. View list of all businesses
2. Filter by status (active/inactive)
3. Click "Create Business" button
4. Fill business details:
   - Business name
   - Business type
   - Owner wallet address
5. Assign business_owner role to wallet
6. Activate/deactivate businesses

#### Manage Users
**Path**: `/admin/users`

**Workflow**:
1. View all registered users
2. Search by wallet address
3. View user's current roles
4. Assign/revoke roles:
   - business_owner
   - manager
   - warehouse
   - dispatcher
   - driver
5. View user activity history

#### Platform Settings
**Path**: `/admin/settings`

**Workflow**:
1. Configure global settings
2. Manage feature flags
3. Set platform-wide policies
4. Configure navigation rules
5. Manage platform themes

#### Audit Logs
**Path**: `/admin/logs`

**Workflow**:
1. View system-wide activity logs
2. Filter by:
   - User
   - Action type
   - Date range
   - Business
3. Export logs for analysis

---

## 2. Business Owner Workflow

**Purpose**: Complete management of a single business

### Home Screen: Business Dashboard

**Key Metrics**:
- Today's revenue
- Active orders
- Low stock alerts
- Driver availability
- Recent transactions

### Primary Workflows

#### Manage Inventory
**Path**: `/business/inventory`

1. **View Inventory**
   - See all products
   - Filter by category
   - Sort by stock level
   - View low stock alerts

2. **Add Product**
   - Click "Add Product"
   - Fill product details:
     - Name, description
     - Price
     - Category
     - Initial stock
     - Images
   - Save product

3. **Update Stock**
   - Select product
   - Adjust quantity
   - Add adjustment note
   - Confirm changes

4. **Manage Categories**
   - Create product categories
   - Organize catalog structure
   - Set category visibility

#### Manage Orders
**Path**: `/business/orders`

1. **View Orders**
   - See all orders
   - Filter by status:
     - Pending
     - Processing
     - Ready for delivery
     - In transit
     - Delivered
     - Cancelled

2. **Process Order**
   - Click on pending order
   - Review order details
   - Verify inventory
   - Update status to "Processing"

3. **Assign Driver**
   - Select "Ready for delivery" order
   - View available drivers
   - Assign driver
   - Driver receives notification

4. **Track Order**
   - View order timeline
   - See driver location (if available)
   - Monitor delivery status

#### Manage Drivers
**Path**: `/business/drivers`

1. **View Driver List**
   - See all registered drivers
   - Check online/offline status
   - View current assignments

2. **Assign Delivery**
   - Select available driver
   - Assign orders
   - Set delivery priority

3. **View Performance**
   - Delivery completion rate
   - Average delivery time
   - Customer ratings
   - Earnings

#### Manage Zones
**Path**: `/business/zones`

1. **Create Zone**
   - Define zone boundaries
   - Set zone name
   - Configure delivery fees

2. **Activate/Deactivate Zones**
   - Toggle zone availability
   - Set operational hours

3. **Assign Drivers to Zones**
   - Link drivers to zones
   - Set zone priorities

#### View Reports
**Path**: `/business/reports`

1. **Revenue Reports**
   - Daily/weekly/monthly revenue
   - Revenue by product
   - Revenue trends

2. **Order Analytics**
   - Order volume
   - Average order value
   - Fulfillment rates

3. **Inventory Reports**
   - Stock levels
   - Turnover rates
   - Reorder recommendations

#### Business Settings
**Path**: `/business/settings`

1. **Business Profile**
   - Update business info
   - Operating hours
   - Contact details

2. **Team Management**
   - Invite team members
   - Assign roles (manager, warehouse, etc.)
   - Manage permissions

3. **Payment Settings**
   - Configure payment methods
   - Set commission rates
   - Payout preferences

---

## 3. Manager Workflow

**Purpose**: Business operations with restricted admin access

### Permissions
- All business_owner permissions EXCEPT:
  - Cannot delete business
  - Cannot create/remove managers
  - Cannot modify owner settings

### Workflows
Same as Business Owner (see above) with noted restrictions

---

## 4. Warehouse Workflow

**Purpose**: Inventory receiving, storage, and order fulfillment

### Home Screen: Warehouse Dashboard

**Key Information**:
- Incoming shipments
- Low stock alerts
- Orders to pack
- Recent stock changes

### Primary Workflows

#### Receive Inventory
**Path**: `/warehouse/receiving`

1. **View Incoming Shipments**
   - List of expected deliveries
   - Purchase orders

2. **Receive Shipment**
   - Scan or select items
   - Count received quantity
   - Compare to expected
   - Update stock levels
   - Add receiving notes
   - Mark as received

#### Pack Orders
**Path**: `/warehouse/packing`

1. **View Orders Ready to Pack**
   - List of confirmed orders
   - Priority indicators

2. **Pack Order**
   - View pick list
   - Locate items in warehouse
   - Scan items (optional)
   - Verify quantities
   - Pack items
   - Print shipping label
   - Mark as "Ready for Driver"

#### Manage Stock
**Path**: `/warehouse/stock`

1. **Stock Adjustments**
   - Adjust for damaged items
   - Adjust for returns
   - Physical count adjustments

2. **Inventory Counts**
   - Perform cycle counts
   - Full inventory audits
   - Reconcile discrepancies

### Restrictions
- Cannot view pricing
- Cannot assign drivers
- Cannot access financial reports
- Cannot modify business settings

---

## 5. Dispatcher Workflow

**Purpose**: Real-time delivery coordination and driver management

### Home Screen: Dispatch Console

**Key Components**:
- Live driver map
- Delivery queue
- Driver status panel
- Assignment controls

### Primary Workflows

#### Monitor Drivers
**Real-time View**

1. **Driver Status Board**
   - Online/offline status
   - Current location (if shared)
   - Current assignment
   - Availability

2. **Driver Details**
   - Click driver to see:
     - Active deliveries
     - Completed today
     - Route efficiency
     - ETA to destination

#### Assign Orders
**Path**: `/dispatch/assignments`

1. **View Unassigned Orders**
   - Orders ready for delivery
   - Priority markers
   - Customer location

2. **Smart Assignment**
   - System suggests best driver based on:
     - Proximity
     - Current load
     - Zone coverage
   - Manual override available

3. **Batch Assignment**
   - Select multiple orders
   - Assign to single driver
   - Route optimization

#### Monitor Deliveries
**Real-time Tracking**

1. **Active Deliveries View**
   - All in-progress deliveries
   - Estimated completion times
   - Delay alerts

2. **Intervention**
   - Reassign if needed
   - Contact driver
   - Update customer
   - Handle exceptions

#### Route Planning
**Path**: `/dispatch/routes`

1. **Optimize Routes**
   - View pending deliveries
   - Optimize for:
     - Shortest distance
     - Quickest time
     - Cost efficiency

2. **Assign Routes**
   - Send optimized route to driver
   - Driver receives turn-by-turn

---

## 6. Sales Workflow

**Purpose**: Customer relationship management and order creation

### Home Screen: Sales CRM

**Key Information**:
- Customer list
- Today's orders
- Follow-up tasks
- Sales pipeline

### Primary Workflows

#### Manage Customers
**Path**: `/sales/customers`

1. **View Customer List**
   - All customers
   - Purchase history
   - Contact information

2. **Customer Profile**
   - Order history
   - Preferences
   - Notes and interactions
   - Lifetime value

3. **Add Notes**
   - Call logs
   - Interaction notes
   - Follow-up reminders

#### Create Orders
**Path**: `/sales/orders/new`

1. **Manual Order Creation**
   - Select customer
   - Add products
   - Apply discounts
   - Set delivery details
   - Process order

2. **Phone Orders**
   - Take order over phone
   - Enter customer details
   - Process payment information
   - Confirm order

#### Follow-ups
**Path**: `/sales/tasks`

1. **Task List**
   - Scheduled follow-ups
   - Customer callbacks
   - Order confirmations

2. **Complete Task**
   - Mark as done
   - Add notes
   - Schedule next action

---

## 7. Customer Service Workflow

**Purpose**: Customer support and issue resolution

### Home Screen: Support Console

**Key Information**:
- Open tickets
- Chat queue
- Recent issues
- Response metrics

### Primary Workflows

#### Handle Tickets
**Path**: `/support/tickets`

1. **View Tickets**
   - Open tickets
   - Filter by:
     - Priority
     - Category
     - Customer

2. **Resolve Ticket**
   - Read issue description
   - Look up order
   - Take action:
     - Modify order
     - Issue refund
     - Escalate to manager
   - Respond to customer
   - Close ticket

#### Order Lookup
**Path**: `/support/orders`

1. **Search Orders**
   - By order number
   - By customer name
   - By phone/email

2. **Order Actions**
   - View full details
   - Modify order
   - Cancel order
   - Reprocess payment
   - Reassign driver

#### Live Chat Support
**Path**: `/support/chat`

1. **Chat Queue**
   - Incoming chat requests
   - Accept chat

2. **Chat Conversation**
   - Assist customer
   - Look up information
   - Perform actions
   - Transfer if needed
   - End conversation

---

## 8. Driver Workflow

**Purpose**: Delivery execution and earnings tracking

### Home Screen: Driver Dashboard

**Key Information**:
- Current delivery
- Assigned tasks
- Today's earnings
- Status toggle

### Primary Workflows

#### Go Online
**Initial Action**

1. **Set Status**
   - Toggle "Online"
   - System makes driver available
   - Start receiving assignments

#### Accept Delivery
**Path**: `/driver/tasks`

1. **View Assigned Deliveries**
   - List of assigned orders
   - Pickup and delivery addresses
   - Order details

2. **Accept Task**
   - Review details
   - Accept or reject
   - If accepted, proceed to pickup

#### Pickup Process
**Workflow**

1. **Navigate to Pickup**
   - View pickup location
   - Get directions (map integration)

2. **Arrive at Pickup**
   - Confirm arrival
   - Verify items with warehouse
   - Scan/check items

3. **Confirm Pickup**
   - Mark items collected
   - Update status
   - Begin delivery

#### Delivery Process
**Workflow**

1. **Navigate to Customer**
   - View customer location
   - Get turn-by-turn directions
   - See customer contact info

2. **Arrive at Destination**
   - Confirm arrival
   - Contact customer if needed

3. **Complete Delivery**
   - Hand over items
   - Get customer confirmation
   - Take photo (if required)
   - Mark as delivered

4. **Complete Task**
   - Update status
   - Earnings automatically calculated
   - Ready for next task

#### View Earnings
**Path**: `/driver/earnings`

1. **Earnings Dashboard**
   - Today's earnings
   - Week/month totals
   - Payment history

2. **Delivery History**
   - Completed deliveries
   - Ratings received
   - Performance metrics

#### Offline Mode
**Special Feature**

- All active deliveries cached
- Can complete deliveries offline
- Data syncs when online
- Route cached locally

---

## 9. Customer Workflow

**Purpose**: Shopping and order management

### Home Screen: Product Catalog

**Layout**:
- Search bar
- Category filters
- Product grid
- Shopping cart icon

### Primary Workflows

#### Browse Products
**Path**: `/store`

1. **View Catalog**
   - All available products
   - Product images and prices
   - Quick add to cart

2. **Search Products**
   - Search by name
   - Filter by category
   - Sort by:
     - Price
     - Popularity
     - New arrivals

#### View Product Details
**Path**: `/store/product/:id`

1. **Product Page**
   - Full description
   - Image gallery
   - Price
   - Availability
   - Reviews (if available)

2. **Add to Cart**
   - Select quantity
   - Add to cart
   - Continue shopping or checkout

#### Shopping Cart
**Path**: `/store/cart`

1. **Review Cart**
   - All cart items
   - Quantities
   - Subtotal

2. **Modify Cart**
   - Update quantities
   - Remove items
   - Apply promo code (if available)

3. **Proceed to Checkout**

#### Checkout
**Path**: `/store/checkout`

1. **Delivery Information**
   - Delivery address
   - Contact phone
   - Delivery instructions

2. **Review Order**
   - Verify items
   - Verify delivery details
   - View total cost

3. **Confirm Order**
   - Wallet signs transaction
   - Order created
   - Confirmation shown

#### Track Order
**Path**: `/store/orders/:id`

1. **Order Status**
   - Current status
   - Timeline view
   - Estimated delivery time

2. **Contact Support**
   - Chat with support
   - Modify order (if possible)
   - Cancel order (if allowed)

#### Order History
**Path**: `/store/orders`

1. **View Past Orders**
   - All previous orders
   - Order status
   - Reorder option

---

## 10. User (Guest) Workflow

**Purpose**: Anonymous browsing with limited features

### Available Features
- Browse catalog
- Search products
- View product details
- View promotions

### Restricted Features
- Cannot add to cart (redirects to login)
- Cannot place orders
- No order history
- No saved preferences

### Conversion Flow
When attempting restricted action:
1. Show login modal
2. "Connect wallet to continue"
3. After login → complete action

---

## Cross-Role Features

### Notifications
**All Roles**
- Real-time notifications
- Notification center
- Mark as read
- Notification preferences

### Profile Management
**All Roles**
- View profile
- Update display name
- Change preferences
- View roles
- Logout

### Multi-Business Support
**Business Roles**
- Switch between businesses
- Each business has separate data
- Role persists per business

### Offline Support
**All Roles**
- Core functions work offline
- Data cached locally
- Syncs when online
- Offline indicator shown

---

## Role Switching

Users with multiple roles can switch:

1. Click profile menu
2. Select "Switch Role"
3. Choose from assigned roles
4. Application reloads with new role
5. Data scoped to new role

---

## Error Handling Flows

### Authentication Failure
1. Show error message
2. Option to retry
3. Option to use different wallet

### Network Offline
1. Show offline banner
2. Enable offline mode
3. Queue actions for sync

### Permission Denied
1. Show "Unauthorized" page
2. Explain required permission
3. Option to request access

---

## Success Metrics by Role

### Infrastructure Owner
- Platform uptime
- Total businesses managed
- User satisfaction

### Business Owner
- Revenue growth
- Order fulfillment rate
- Customer retention

### Manager
- Operational efficiency
- Team performance

### Warehouse
- Packing accuracy
- Processing speed
- Inventory accuracy

### Dispatcher
- On-time delivery rate
- Driver utilization
- Route efficiency

### Sales
- Conversion rate
- Average order value
- Customer satisfaction

### Customer Service
- Ticket resolution time
- Customer satisfaction
- First-contact resolution

### Driver
- Deliveries per day
- On-time rate
- Earnings

### Customer
- Order satisfaction
- Repeat purchase rate
- Cart completion rate
