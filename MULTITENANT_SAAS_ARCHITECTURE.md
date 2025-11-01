# Multi-Tenant SaaS E-commerce Platform Architecture

## Executive Summary

This document outlines the comprehensive transformation of the existing logistics management system into a full-featured multi-tenant SaaS platform that combines white-labeled e-commerce storefronts with delivery logistics, similar to Wolt's business model.

The platform will serve four distinct user types:
1. **Platform Administrators** - Manage the entire platform, businesses, and shared resources
2. **Business Owners** - Manage their storefront, products, orders, and team
3. **Customers** - Browse products, place orders, and track deliveries
4. **Drivers** - Accept deliveries, navigate routes, and manage earnings

## Current System Analysis

### Existing Infrastructure

The system already has:
- ✅ Multi-tenant foundation with `infrastructures` and `businesses` tables
- ✅ Comprehensive RBAC system with roles, permissions, and custom roles
- ✅ User management with business context switching
- ✅ PIN authentication and session management
- ✅ Audit logging infrastructure
- ✅ Web3 authentication support (Ethereum, Solana)

### What Needs to Be Built

1. **E-commerce Layer**
   - Product catalog with categories and variants
   - Customer accounts and order management
   - Shopping cart and checkout
   - Payment processing integration
   - Storefront configuration

2. **Enhanced Driver System**
   - Driver profiles with vehicle details
   - Shared driver pool management
   - Earnings tracking and payouts
   - GPS location tracking
   - Availability scheduling

3. **Customer Experience**
   - Public storefront browsing
   - Guest and authenticated checkout
   - Real-time order tracking
   - Product reviews and ratings
   - Delivery address management

4. **Business Management**
   - Subscription and billing system
   - Storefront customization
   - Advanced analytics
   - Customer relationship management
   - Financial reporting

## Database Schema Design

### Phase 1: Core E-commerce Tables

#### Subscription Management
```sql
subscription_plans
├── plan_key (starter, growth, professional, enterprise)
├── price_monthly, price_yearly
├── features (jsonb)
└── limits (jsonb)

business_subscriptions
├── business_id
├── plan_id
├── status (trial, active, past_due, canceled)
├── current_period_start, current_period_end
├── features_enabled (jsonb)
└── usage_limits (jsonb)
```

#### Storefront Configuration
```sql
business_storefront_settings
├── business_id
├── subdomain (unique)
├── custom_domain (unique)
├── theme_colors (jsonb)
├── operating_hours (jsonb)
├── logo_url, banner_url
└── is_published
```

#### Customer Management
```sql
customers
├── business_id
├── email, phone
├── full_name
├── loyalty_points
├── total_orders, total_spent
└── preferences (jsonb)

customer_addresses
├── customer_id, business_id
├── address_line1, city, country
├── latitude, longitude
├── delivery_instructions
└── is_default

customer_sessions
├── customer_id (nullable for guests)
├── business_id
├── session_token
├── cart_data (jsonb)
└── expires_at

customer_payment_methods
├── customer_id, business_id
├── payment_type (card, cash, digital_wallet)
├── card_last4, card_brand
├── gateway_payment_method_id
└── is_default
```

#### Product Catalog
```sql
products
├── business_id
├── sku, name, description
├── price, cost
├── category
├── images (array)
├── is_published
└── preparation_time_minutes

product_categories
├── business_id
├── parent_category_id (for hierarchy)
├── name, slug
├── display_order
└── is_active

product_images
├── product_id
├── image_url
├── display_order
└── is_primary

product_variants
├── product_id
├── variant_name (e.g., "Large", "Red")
├── sku
├── price_adjustment
├── options (jsonb)
└── stock_quantity

product_reviews
├── product_id, customer_id, business_id
├── rating (1-5)
├── review_text
├── verified_purchase
└── is_approved
```

#### Enhanced Orders
```sql
orders (extend existing)
├── customer_id
├── delivery_type (delivery, pickup)
├── payment_status, payment_method
├── scheduled_delivery_time
├── tax_amount, delivery_fee
└── discount_amount

order_items
├── order_id
├── product_id, variant_id
├── quantity, unit_price
├── subtotal, tax_amount
└── special_instructions

order_status_history
├── order_id
├── from_status, to_status
├── changed_by
└── notes

order_tracking_events
├── order_id
├── event_type, event_title
├── latitude, longitude
└── metadata (jsonb)

order_reviews
├── order_id, customer_id
├── overall_rating
├── food_quality_rating
├── delivery_rating
├── driver_tip
└── review_text
```

### Phase 2: Driver Management

```sql
driver_profiles
├── user_id
├── driver_type (dedicated, shared_pool)
├── vehicle_type, vehicle_plate
├── license_number, insurance_policy
├── rating, rating_count
├── total_deliveries
├── current_latitude, current_longitude
├── is_available, is_online
└── bank_account_details (jsonb)

driver_business_assignments
├── driver_id, business_id
├── is_active
├── priority_level
└── assigned_at

driver_availability_windows
├── driver_id
├── day_of_week (0-6)
├── start_time, end_time
└── is_active

driver_earnings
├── driver_id, business_id, order_id
├── delivery_fee, distance_fee
├── tip_amount
├── surge_multiplier
├── platform_fee
├── net_earnings
└── payout_status

driver_locations
├── driver_id
├── latitude, longitude
├── accuracy, heading, speed
└── recorded_at
```

### Phase 3: Financial Tracking

```sql
payment_transactions
├── business_id, customer_id, order_id
├── amount, currency
├── payment_method
├── payment_gateway
├── gateway_transaction_id
├── status (pending, completed, failed, refunded)
└── metadata (jsonb)

business_payouts
├── business_id
├── payout_period_start, payout_period_end
├── gross_revenue
├── platform_fees
├── driver_payments
├── net_payout
└── payout_status

platform_fees
├── business_id, order_id
├── fee_type
├── base_amount
├── fee_percentage
├── fee_amount
└── payout_status
```

## API Architecture

### Customer-Facing APIs (Public/Authenticated)

```
Public Storefront APIs:
GET    /api/v1/storefronts/:subdomain           - Get storefront config
GET    /api/v1/storefronts/:subdomain/products  - Browse products
GET    /api/v1/storefronts/:subdomain/categories - Product categories
POST   /api/v1/customers/guest-checkout         - Anonymous order

Customer Account APIs:
POST   /api/v1/auth/customer/register           - Customer signup
POST   /api/v1/auth/customer/login              - Customer login
GET    /api/v1/customers/me                     - Profile
PATCH  /api/v1/customers/me                     - Update profile
GET    /api/v1/customers/me/addresses           - Addresses
POST   /api/v1/customers/me/addresses           - Add address
GET    /api/v1/customers/me/orders              - Order history
POST   /api/v1/orders                           - Create order
GET    /api/v1/orders/:id/tracking              - Track order
POST   /api/v1/orders/:id/review                - Review order
```

### Business Owner APIs

```
Dashboard & Analytics:
GET    /api/v1/business/dashboard               - Metrics overview
GET    /api/v1/business/analytics               - Detailed analytics
GET    /api/v1/business/customers               - Customer list
GET    /api/v1/business/financial-summary       - Financial reports

Product Management:
GET    /api/v1/business/products                - List products
POST   /api/v1/business/products                - Create product
PATCH  /api/v1/business/products/:id            - Update product
DELETE /api/v1/business/products/:id            - Delete product
POST   /api/v1/business/products/:id/images     - Upload images

Order Management:
GET    /api/v1/business/orders                  - List orders
PATCH  /api/v1/business/orders/:id              - Update order
POST   /api/v1/business/orders/:id/assign       - Assign driver

Storefront Config:
GET    /api/v1/business/storefront              - Get settings
PATCH  /api/v1/business/storefront              - Update settings
```

### Driver APIs

```
Assignment & Delivery:
GET    /api/v1/driver/assignments               - Available orders
POST   /api/v1/driver/assignments/:id/accept    - Accept delivery
POST   /api/v1/driver/assignments/:id/decline   - Decline delivery
PATCH  /api/v1/driver/deliveries/:id/status     - Update status
POST   /api/v1/driver/deliveries/:id/proof      - Upload proof
POST   /api/v1/driver/location                  - Update location

Earnings & Schedule:
GET    /api/v1/driver/earnings                  - Earnings summary
GET    /api/v1/driver/schedule                  - Availability
PATCH  /api/v1/driver/availability              - Update status
```

### Platform Admin APIs

```
Business Management:
GET    /api/v1/admin/businesses                 - List businesses
POST   /api/v1/admin/businesses                 - Create business
PATCH  /api/v1/admin/businesses/:id             - Update business
GET    /api/v1/admin/platform-metrics           - Platform analytics

Driver Pool Management:
GET    /api/v1/admin/drivers                    - Shared drivers
POST   /api/v1/admin/drivers/:id/assign         - Assign to business
GET    /api/v1/admin/driver-performance         - Performance metrics

Financial Operations:
GET    /api/v1/admin/payouts                    - Payout queue
POST   /api/v1/admin/payouts/:id/process        - Process payout
GET    /api/v1/admin/platform-fees              - Fee summary
```

## User Flows

### 1. Customer Discovers and Orders

```
Customer Journey:
1. Visits business storefront via subdomain (e.g., pizzashop.platform.com)
2. Browses product catalog with filters and search
3. Views product details, images, reviews
4. Adds items to cart (persisted in session)
5. Proceeds to checkout
   - Option A: Guest checkout (email + phone)
   - Option B: Sign up / Log in for faster checkout
6. Enters/selects delivery address
7. Chooses delivery time (ASAP or scheduled)
8. Selects payment method
9. Reviews order summary
10. Confirms order
11. Receives order confirmation with tracking link
12. Tracks order real-time on map
13. Receives delivery
14. Rates order and driver
```

### 2. Business Owner Manages Operations

```
Daily Operations:
1. Logs into business dashboard
2. Reviews new orders in real-time
3. Confirms orders and prepares items
4. Assigns orders to available drivers
   - Dedicated drivers (auto-assign)
   - Shared pool drivers (manual or auto)
5. Monitors order progress
6. Handles customer inquiries
7. Reviews daily revenue and metrics
8. Manages product inventory
9. Responds to customer reviews
10. Views financial reports
```

### 3. Driver Fulfills Deliveries

```
Delivery Workflow:
1. Opens driver app and goes online
2. Receives order assignment notification
3. Reviews order details (items, address, payment)
4. Accepts assignment (30-second timeout)
5. Navigates to business location
6. Confirms pickup
7. Follows GPS navigation to customer
8. Contacts customer if needed
9. Arrives at delivery location
10. Completes delivery
11. Uploads proof photo
12. Collects payment if COD
13. Marks delivery complete
14. Moves to next delivery or waits for new assignment
```

### 4. Platform Admin Onboards Business

```
Business Onboarding:
1. Creates new business account
2. Enters business details and contact info
3. Selects subscription plan
4. Configures business settings
   - Currency, timezone
   - Operating hours
   - Delivery radius
5. Creates business owner account
6. Sets up payment gateway integration
7. Configures initial product categories
8. Customizes storefront theme
9. Assigns dedicated drivers (if applicable)
10. Enables shared driver pool access
11. Activates business and generates storefront URL
12. Sends welcome email to business owner
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Multi-tenant infrastructure with subscription management

**Tasks:**
- [ ] Create database migration for subscription and storefront tables
- [ ] Implement business subscription management service
- [ ] Build platform admin dashboard for business CRUD
- [ ] Create business onboarding workflow
- [ ] Implement RLS policies for tenant isolation
- [ ] Set up audit logging for all tenant operations
- [ ] Write comprehensive integration tests

**Deliverables:**
- Platform admin can create and manage businesses
- Businesses can be assigned to subscription plans
- Storefront subdomains are generated and reserved
- Complete data isolation between businesses

### Phase 2: Customer & E-commerce (Weeks 5-8)
**Goal:** Customer-facing storefront with product catalog and ordering

**Tasks:**
- [ ] Create customer, product, and order tables
- [ ] Build customer registration and authentication
- [ ] Develop storefront configuration interface
- [ ] Create product management UI for business owners
- [ ] Build public storefront with product browsing
- [ ] Implement shopping cart with session persistence
- [ ] Create checkout flow with address management
- [ ] Integrate payment gateway (Stripe/PayPal)
- [ ] Build order confirmation and notification system

**Deliverables:**
- Customers can browse products and create accounts
- Business owners can manage their product catalog
- Complete checkout flow with payment processing
- Order confirmation emails and SMS notifications
- Guest checkout for one-time purchases

### Phase 3: Driver System (Weeks 9-12)
**Goal:** Driver management with assignment and tracking

**Tasks:**
- [ ] Create driver profile and earnings tables
- [ ] Build driver registration and onboarding
- [ ] Develop driver mobile app interface
- [ ] Implement GPS location tracking
- [ ] Create driver assignment algorithm
- [ ] Build dispatch board for businesses
- [ ] Implement order assignment notifications
- [ ] Create driver earnings calculator
- [ ] Build payout processing system

**Deliverables:**
- Drivers can register and complete onboarding
- Business can assign drivers to orders
- Shared driver pool with auto-assignment
- Real-time driver location tracking
- Automated earnings calculation
- Driver payout reports

### Phase 4: Real-time Features (Weeks 13-16)
**Goal:** Live tracking and communication

**Tasks:**
- [ ] Implement order tracking page with live map
- [ ] Build WebSocket-based real-time updates
- [ ] Create push notification system
- [ ] Implement customer-driver messaging
- [ ] Build business-customer support chat
- [ ] Create order history with reorder
- [ ] Implement review and rating system
- [ ] Build loyalty points program

**Deliverables:**
- Customers can track orders in real-time
- Push notifications for all status updates
- In-app messaging between parties
- Product and order review system
- Loyalty rewards tracking

### Phase 5: Analytics & Optimization (Weeks 17-20)
**Goal:** Business intelligence and performance

**Tasks:**
- [ ] Build business analytics dashboard
- [ ] Create platform admin analytics
- [ ] Implement driver performance tracking
- [ ] Build custom report generator
- [ ] Create data export functionality
- [ ] Implement caching layer for performance
- [ ] Optimize database queries and indexes
- [ ] Set up CDN for static assets
- [ ] Implement rate limiting and security

**Deliverables:**
- Comprehensive analytics for all user types
- Exportable reports in CSV/PDF
- Performance optimizations in place
- Security hardening completed
- Production-ready monitoring

### Phase 6: Polish & Launch (Weeks 21-24)
**Goal:** Production readiness and launch

**Tasks:**
- [ ] End-to-end testing of all flows
- [ ] Security audit and penetration testing
- [ ] Accessibility compliance (WCAG 2.1)
- [ ] Mobile responsiveness optimization
- [ ] API documentation with examples
- [ ] User training materials and videos
- [ ] Help center and FAQ
- [ ] Staging environment validation
- [ ] Production deployment
- [ ] Post-launch monitoring and support

**Deliverables:**
- Fully tested platform across all features
- Security certified and compliant
- Complete documentation
- Training materials for all user types
- Production deployment successful
- Monitoring and alerting active

## Key Design Decisions

### 1. Data Isolation Strategy
- **Two-tier isolation**: Infrastructure level and Business level
- **RLS enforcement**: Every table has policies checking business_id
- **JWT claims**: business_id embedded in auth tokens
- **Audit logging**: All cross-business access attempts logged

### 2. Driver Pool Model
- **Hybrid approach**: Both dedicated and shared drivers
- **Business choice**: Businesses opt-in to shared pool
- **Priority system**: Dedicated drivers get first priority
- **Fair distribution**: Shared drivers assigned via scoring algorithm

### 3. Payment Processing
- **Multi-gateway support**: Stripe primary, extensible architecture
- **Business flexibility**: Each business can use their own gateway
- **Platform fees**: Automatic calculation on each transaction
- **Payout automation**: Weekly/monthly business payouts

### 4. Scalability Approach
- **Horizontal scaling**: Stateless edge functions
- **Connection pooling**: PgBouncer for database connections
- **Caching layers**: Redis for sessions, CDN for assets
- **Read replicas**: Separate read/write workloads

### 5. Real-time Architecture
- **Supabase Realtime**: WebSocket subscriptions per business
- **Graceful degradation**: Fallback to polling if needed
- **Rate limiting**: Per-user subscription limits
- **Geographic distribution**: Edge functions for low latency

## Security Considerations

### Authentication
- Multiple auth methods supported (Telegram, Web3, Email/Password)
- JWT tokens with business and role claims
- Session management with sliding expiration
- PIN-based re-authentication for sensitive operations

### Authorization
- Comprehensive RBAC with permission matrix
- Business context validation on all operations
- RLS policies enforced at database level
- Audit trail for permission failures

### Data Protection
- PII encryption at rest
- Secure payment method storage
- HTTPS enforced for all traffic
- Customer data isolated per business

### Compliance
- GDPR-ready with data export/deletion
- PCI DSS compliant payment handling
- Regular security audits
- Incident response procedures

## Performance Targets

### Response Times
- API endpoints: p95 < 200ms
- Page loads: < 2 seconds
- Real-time updates: < 500ms latency

### Throughput
- 1000+ concurrent users per business
- 10,000+ orders per day platform-wide
- 100+ driver location updates per second

### Availability
- 99.9% uptime SLA
- Automated failover
- Zero-downtime deployments
- Graceful degradation

## Next Steps

To begin implementation:

1. **Review and approve this architecture document**
2. **Set up development environment with feature flags**
3. **Create first migration for Phase 1 tables**
4. **Build platform admin dashboard MVP**
5. **Implement business onboarding flow**
6. **Deploy to staging for testing**

## Questions to Address

Before starting implementation, please clarify:

1. **Customer Authentication**: Should customers have full accounts or primarily guest checkout?
2. **Shared Driver Pool**: Should drivers see orders from all businesses or only their assigned ones?
3. **White-Label Level**: Complete custom domains or subdomain-based storefronts?
4. **Payment Gateway**: Stripe as primary? Any regional alternatives needed?
5. **Mobile Apps**: Native apps required or PWA sufficient?
6. **Multi-language**: Support multiple languages from day one?

## Success Metrics

### Business Metrics
- Number of active businesses
- Monthly recurring revenue (MRR)
- Customer acquisition cost (CAC)
- Average revenue per business
- Churn rate

### User Metrics
- Active customers per business
- Order frequency and value
- Driver utilization rate
- Customer satisfaction scores
- Driver retention rate

### Platform Metrics
- API response times
- Error rates
- System uptime
- Database performance
- Support ticket volume

---

*This architecture is designed to be implemented incrementally while maintaining the existing system's functionality. Each phase builds on the previous one, allowing for iterative deployment and validation.*
