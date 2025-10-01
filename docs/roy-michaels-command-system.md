# Roy Michaels Command System: Logistics Mini App Architecture Summary

## 1. Core Philosophy
This is not just an app. This is a command system built in the Roy Michaels style—private, precise, and powerful—designed for full control over operations, movement, inventory, and sales.

## 2. Role-Based Sandboxes
Each role receives a private interface with tailored bottom tabs.

### Owner / Manager
- 👑 **Dashboard ("Eye of God")**
- 📊 **Stats**
- 👥 **Partners**
- 📜 **Orders**
- ⚙️ **Settings**

### Sales (Internal Sellers)
- 🛍️ **Orders (Text or Storefront)**
- 📦 **Products**
- 📈 **My Stats**
- 💬 **Chat**
- ⚙️ **Settings**

### Warehouse
- 📦 **Inventory**
- 🚚 **Incoming**
- 🏷️ **Restock Requests**
- 📊 **Logs**
- ⚙️ **Settings**

### Driver (Delivery + Micro-Warehouse)
- 🚚 **My Deliveries**
- 📦 **My Inventory**
- 🗺️ **My Zones**
- 🔵 **Online/Offline Switch**
- ⚙️ **Settings**

## 3. Inventory Control System
Inventory is live-tracked, granular, and role-restricted.
- Products can exist in the Central Warehouse, Driver Inventory, or Reserved states.
- Every movement is logged.
- Low-stock conditions trigger automatic alerts.
- Restock requests flow from Sales → Warehouse → Manager approval.

**Role permissions**
- Managers: full access.
- Warehouse: confirm deliveries and restocks.
- Sales: view (color-based) and request restock.
- Drivers: view only their personal inventory.

## 4. Order Placement Modes
Sales representatives can place orders through two modes:
- 🔢 **DM Text Order**: Fast-entry format, e.g., `בלו קוש x2`.
- 🌐 **Visual Storefront**: Browse products, select quantities, and check out Shopify-style.

Both modes update inventory, track revenue, and attach the salesperson ID.

## 5. Driver Logic (Wolt Style)
Drivers operate with personal inventory and zone assignments.
- 🗺️ Zones are multi-city ready.
- 🔵 Status: Online drivers appear in dispatch; Offline drivers are hidden.
- 🚚 Inventory is tracked per driver.
- ⚠️ Restock: Orders are blocked if stock is low.
- 🏠 Assignments auto-dispatch to available drivers in the zone.

## 6. Manager Revenue Intelligence (Empire Dashboard)
Live insights include:
- Today’s revenue
- Order count
- Active drivers
- Low-stock alerts
- Zone coverage

Additional features:
- Charts for revenue trends and orders per hour
- Reports exportable as CSV/JSON
- Telegram summary button

## 7. Dispatch Logic
Order dispatch follows this pipeline:
1. Find online drivers.
2. Filter by zone.
3. Filter by available inventory.
4. Prioritize (future enhancements: history, load balancing, distance).
5. Assign and notify.

## 8. Backend Tables Added
- `users`, `roles`, `permissions`
- `products`, `categories`, `inventory` (per location)
- `orders`, `order_items`
- `driver_inventory`
- `zones`, `driver_zones`
- `restock_requests`
- `inventory_logs`
- `sales_logs`

## 9. UI Theme
Dark, royal purple theme with sharp contrast, Telegram-native, and touch-optimized. Uses minimalist icons and role-colored highlights:
- Manager: gold
- Sales: blue
- Warehouse: gray
- Driver: green

## 10. Capabilities Enabled
- Fully remote command over logistics
- Sales attribution and revenue tracking
- Real-time geographic dispatch
- Dynamic inventory control
- Zero-guesswork manager decision-making
- Privacy-preserving driver flow (no GPS required)

**Phase 2 Targets**: Loyalty system, product promotions, client CRM, and beyond.
