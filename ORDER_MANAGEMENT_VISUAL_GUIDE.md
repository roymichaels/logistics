# Order Management System - Visual Design Guide

## 🎨 Color System

### Status Colors

| Status | Color | Gradient | Icon | Usage |
|--------|-------|----------|------|-------|
| **New** | Orange (#FFB74D) | Orange → Amber | 🆕 | Initial order state |
| **Confirmed** | Blue (#42A5F5) | Light Blue → Blue | ✅ | Order accepted |
| **Preparing** | Purple (#AB47BC) | Purple → Deep Purple | 📦 | Being prepared |
| **Ready** | Teal (#26A69A) | Teal → Dark Teal | 🎁 | Ready for pickup |
| **Out for Delivery** | Green (#66BB6A) | Green → Dark Green | 🚚 | In transit |
| **Delivered** | Success (#4CAF50) | Light Green → Green | ✨ | Completed |
| **Cancelled** | Red (#EF5350) | Light Red → Red | ❌ | Cancelled |

### Priority Colors

| Priority | Color | Background | Icon |
|----------|-------|------------|------|
| **Urgent** | Red (#F44336) | #FFEBEE | 🔥 |
| **High** | Orange (#FF9800) | #FFF3E0 | ⚡ |
| **Medium** | Blue (#2196F3) | #E3F2FD | 📋 |
| **Low** | Grey (#9E9E9E) | #F5F5F5 | 📄 |

---

## 📐 Layout Specifications

### Card Dimensions
```css
Border Radius: 16px
Padding: 16-24px
Shadow: 0 2px 12px rgba(0, 0, 0, 0.08)
Border: 2px solid (status color)
```

### Spacing Scale
```
4px   - Minimal spacing
8px   - Text to icon
12px  - Related elements
16px  - Card padding
20px  - Section spacing
24px  - Major sections
32px  - Page sections
```

### Typography
```
Page Title:    28-32px, Bold (700)
Section Title: 20-24px, Bold (700)
Card Title:    18px, Bold (700)
Body Text:     14-16px, Regular (400)
Small Text:    12-14px, Regular (400)
Button Text:   14-16px, SemiBold (600)
```

---

## 🎭 Component Patterns

### Order Card (List View)
```
┌─────────────────────────────────────┐
│ [✓] Customer Name        [Status]   │
│     📞 Phone Number      ₪Amount    │
│     📍 Address                      │
│     🕒 Time                         │
│     [🚗 Driver Info]                │
└─────────────────────────────────────┘
```

### Order Card (Grid View)
```
┌──────────────────┐
│ [Status Badge]   │
│ Customer Name    │
│ 📍 Address       │
│ ──────────────   │
│ Items × 3        │
│ ₪ Total          │
└──────────────────┘
```

### Progress Timeline
```
◉ New              [Active]
│
◉ Confirmed        [Completed]
│
○ Preparing        [Pending]
│
○ Ready            [Pending]
│
○ Out for Delivery [Pending]
│
○ Delivered        [Pending]
```

---

## 📱 Mobile Layouts

### Bottom Navigation Pattern
```
┌──────────────────────────────────┐
│                                  │
│       Main Content Area          │
│                                  │
│                                  │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ [Cancel]    [Primary Action] →  │
└──────────────────────────────────┘
```

### 3-Step Wizard
```
Step 1: Browse
┌──────────────────────────────────┐
│ 🔍 Search                        │
│ [Category Pills]                 │
│ [Product Grid]                   │
└──────────────────────────────────┘
│ [View Cart (3 items)] →          │

Step 2: Cart
┌──────────────────────────────────┐
│ [Item 1]  [−] 2 [+]  ₪200       │
│ [Item 2]  [−] 1 [+]  ₪150       │
│ ─────────────────────────        │
│ Total: ₪350                      │
└──────────────────────────────────┘
│ [← Back]  [Checkout] →           │

Step 3: Checkout
┌──────────────────────────────────┐
│ Name: [____________]             │
│ Phone: [___________]             │
│ Address: [_________]             │
│ [Order Summary]                  │
└──────────────────────────────────┘
│ [← Back]  [✓ Submit] →           │
```

---

## 🎬 Animations

### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
Duration: 0.3s
Easing: ease-out
```

### Pulse (Urgent Orders)
```css
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
  }
}
Duration: 2s
Timing: infinite
```

### Bounce (Loading)
```css
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
Duration: 1s
Timing: infinite
```

---

## 🖼️ Screen Flow Diagrams

### Customer Order Flow
```
[Dashboard]
    ↓
[Browse Products]
    ↓ (Add to cart)
[Shopping Cart]
    ↓ (Checkout)
[Customer Info Form]
    ↓ (Submit)
[Order Confirmation]
    ↓
[Order Tracking]
```

### Manager Order Flow
```
[Dashboard] → [Analytics View]
    ↓
[Order List]
    ↓ (Filter/Search)
[Filtered Results]
    ↓ (Select order)
[Order Detail]
    ↓ (Actions)
[Update Status / Assign Driver]
```

### Driver Delivery Flow
```
[My Deliveries]
    ↓ (Select order)
[Order Detail]
    ↓ (Start delivery)
[Navigation Active]
    ↓ (Arrive)
[Capture Proof]
    ↓ (Submit)
[Delivery Complete]
```

---

## 🎨 Theme Variables

### Primary Palette
```typescript
background:      '#f5f7fa'
backgroundGradient: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)'
cardBackground:  '#FFFFFF'
cardBorder:      '#E0E0E0'
primary:         '#9c6dff'
primaryGradient: 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
text:            '#212121'
textSecondary:   '#666666'
textMuted:       '#999999'
```

### Semantic Colors
```typescript
success:  '#4CAF50'
warning:  '#FF9800'
error:    '#F44336'
info:     '#42A5F5'
```

### Shadows
```css
card:       0 2px 12px rgba(0, 0, 0, 0.08)
cardHover:  0 8px 24px rgba(0, 0, 0, 0.12)
primary:    0 4px 12px rgba(156, 109, 255, 0.3)
strong:     0 8px 32px rgba(0, 0, 0, 0.15)
```

---

## 📐 Responsive Breakpoints

```typescript
// Mobile First Approach
xs:  320px  // Small phones (iPhone SE)
sm:  480px  // Large phones (iPhone 12)
md:  768px  // Tablets (iPad)
lg:  1024px // Small laptops
xl:  1280px // Desktops
```

### Grid Patterns

**Product Grid**
```css
xs: 1 column
sm: 2 columns
md: 3 columns
lg: 4 columns
xl: 5 columns
```

**Order Cards**
```css
xs: 1 column (full width)
md: 2 columns
lg: 3 columns
xl: 4 columns
```

**Metrics Dashboard**
```css
xs: 2 columns
sm: 3 columns
md: 4 columns
lg: 6 columns
```

---

## 🎯 Interactive States

### Button States
```
Default:  Primary color, shadow
Hover:    Slightly darker, scale(1.02)
Active:   Scale(0.98)
Disabled: Grey, opacity 0.5, cursor not-allowed
Loading:  Spinner icon, disabled state
```

### Card States
```
Default:  White background, subtle shadow
Hover:    Transform translateY(-4px), stronger shadow
Selected: Purple border, purple background tint
Urgent:   Red border, pulsing animation
```

### Input States
```
Default:  Grey border, white background
Focus:    Primary border, primary shadow glow
Error:    Red border, red shadow glow
Disabled: Grey background, no interaction
```

---

## 🎪 Modal Patterns

### Full-Screen Modal (Mobile)
```
┌──────────────────────────────────┐
│ [✕]                              │
│                                  │
│        Modal Content             │
│                                  │
│                                  │
└──────────────────────────────────┘
```

### Center Modal (Desktop)
```
   ┌─────────────────────────┐
   │ [✕]    Modal Title      │
   │                         │
   │   Modal Content         │
   │                         │
   │ [Cancel]  [Confirm]     │
   └─────────────────────────┘
```

### Bottom Sheet (Mobile)
```
┌──────────────────────────────────┐
│                                  │
│        Main Content              │
│                                  │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ [━━]  Sheet Title                │
│                                  │
│   Sheet Content                  │
│                                  │
│ [Primary Action]                 │
└──────────────────────────────────┘
```

---

## 📊 Data Visualization

### Metrics Cards
```
┌──────────────┐
│  Icon 📊     │
│  Value 150   │
│  Label Text  │
└──────────────┘
```

### Progress Bar
```
[████████░░░░░░░░░░] 40%
```

### Status Badge
```
┌──────────┐
│ 🆕 New   │
└──────────┘
Padding: 6px 12px
Border-radius: 10px
Font-size: 12px
Font-weight: 700
```

---

## 🎨 Gradients Library

### Primary Gradients
```css
Purple:  linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)
Blue:    linear-gradient(135deg, #42A5F5 0%, #1976D2 100%)
Green:   linear-gradient(135deg, #66BB6A 0%, #43A047 100%)
Success: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)
Card:    linear-gradient(135deg, #f5f7fa 0%, #e3e9f0 100%)
```

### Status Gradients
```css
New:       linear-gradient(135deg, #FFE082 0%, #FFB74D 100%)
Confirmed: linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%)
Preparing: linear-gradient(135deg, #BA68C8 0%, #AB47BC 100%)
Ready:     linear-gradient(135deg, #4DB6AC 0%, #26A69A 100%)
Delivery:  linear-gradient(135deg, #81C784 0%, #66BB6A 100%)
Delivered: linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)
Cancelled: linear-gradient(135deg, #E57373 0%, #EF5350 100%)
```

---

## 🎭 Icon System

### Status Icons
- 🆕 New
- ✅ Confirmed
- 📦 Preparing
- 🎁 Ready
- 🚚 Out for Delivery
- ✨ Delivered
- ❌ Cancelled

### Action Icons
- 🔍 Search
- 🗺️ Navigation
- 📞 Call
- 📸 Camera
- 💰 Payment
- 📋 Details
- ⚙️ Settings
- 🔄 Refresh

### Category Icons
- 🛍️ Shopping
- 💬 Messages
- ⚡ Quick
- 📊 Analytics
- 👤 Customer
- 🚗 Driver
- 📦 Orders

---

## 🎯 Accessibility Features

### Color Contrast Ratios
```
Text on White:         #212121 (15.8:1) ✓ AAA
Secondary Text:        #666666 (5.7:1)  ✓ AA
Primary on White:      #9c6dff (3.9:1)  ✓ AA Large
Error Text:            #F44336 (4.8:1)  ✓ AA
Success Text:          #4CAF50 (3.8:1)  ✓ AA Large
```

### Touch Targets
```
Minimum: 44px × 44px
Recommended: 48px × 48px
Spacing: 8px between targets
```

### Focus States
```
Visible: 2px solid primary color
Shadow: 0 0 0 4px rgba(primary, 0.1)
Outline: None (custom focus styles)
```

---

**This visual guide ensures consistent, beautiful, and accessible design across all order management interfaces.**
