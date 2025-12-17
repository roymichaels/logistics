# 💰 Telegram/TON Payment System

Complete cryptocurrency payment infrastructure for delivery platforms with TON blockchain integration and Telegram Stars support.

## 🚀 Features

### Payment Methods
- **TON Wallet** - Direct blockchain payments with escrow
- **Telegram Stars** - In-app payments via Telegram
- **USDT Support** - Stablecoin payments (optional)

### Automated Commission Splits
- **70%** to Business Owner
- **20%** to Driver
- **10%** Platform Fee

### Real-time Features
- Live payment status tracking
- Instant settlement after delivery
- Blockchain transaction verification
- Driver earnings dashboard

## 📦 Components

### Customer Flow
```tsx
import { PaymentMethodSelector } from '@/components/payments';

<PaymentMethodSelector
  orderId="order-123"
  businessId="biz-456"
  amount={250}
  onSuccess={(paymentId) => console.log('Paid!', paymentId)}
/>
```

### Driver Earnings
```tsx
import { DriverPayoutDashboard } from '@/components/payments';

<DriverPayoutDashboard
  driverId={currentUser.id}
  businessId={currentBusiness.id}
/>
```

### Business Settings
```tsx
import { TelegramBotSetup, CommissionDashboard } from '@/components/payments';

// Bot Configuration
<TelegramBotSetup businessId={business.id} />

// Commission Tracking
<CommissionDashboard
  businessId={business.id}
  userRole="business_owner"
/>
```

### Order Payment Status
```tsx
import { OrderPaymentStatus } from '@/components/payments';

<OrderPaymentStatus
  orderId="order-123"
  showActions={true}
/>
```

## 🗄️ Database Schema

### payment_transactions
Main payment tracking table:
- TON/Stars/USDT payment records
- Escrow status tracking
- Exchange rate snapshots
- Commission calculations

### driver_payouts
Driver withdrawal management:
- Payout requests
- Wallet addresses
- Transaction hashes
- Processing status

### commission_ledger
Commission distribution:
- Platform fees
- Business earnings
- Infrastructure shares
- Claim status

### telegram_integration
Bot configuration per business:
- Bot tokens (encrypted)
- Stars merchant IDs
- Webhook URLs
- Welcome messages

### crypto_wallets
User wallet management:
- Multiple wallet types
- Primary wallet selection
- Verification status

## 🔧 API Endpoints (Edge Functions)

### payment-ton-create
Creates escrow payment transaction:
```typescript
POST /functions/v1/payment-ton-create
{
  "orderId": "order-123",
  "businessId": "biz-456",
  "amountDisplay": 250,
  "walletAddress": "0:abc...",
  "cryptoCurrency": "TON"
}
```

### payment-ton-release
Releases escrowed funds after delivery:
```typescript
POST /functions/v1/payment-ton-release
{
  "paymentId": "payment-789",
  "orderId": "order-123",
  "transactionHash": "abc123..."
}
```

### payment-stars-create
Creates Telegram Stars invoice:
```typescript
POST /functions/v1/payment-stars-create
{
  "orderId": "order-123",
  "businessId": "biz-456",
  "amountDisplay": 250,
  "telegramUserId": "123456"
}
```

### driver-payout-request
Driver withdrawal request:
```typescript
POST /functions/v1/driver-payout-request
{
  "amount": 1.5,
  "currency": "TON",
  "walletAddress": "0:abc...",
  "businessId": "biz-456"
}
```

## 🔐 Security

### Row Level Security (RLS)
All tables have comprehensive RLS policies:
- Customers see only their payments
- Drivers see only their earnings
- Business owners see their business data
- Infrastructure owners have platform-wide access

### Data Isolation
Multi-tenant architecture:
- Business-level data segregation
- Infrastructure-level partitioning
- User-specific access controls

## 📊 Example Pages

### CheckoutPage
Complete checkout flow with payment selection:
```
/src/pages/CheckoutPage.tsx
```

### DriverEarningsPage
Driver earnings dashboard with stats:
```
/src/pages/DriverEarningsPage.tsx
```

### BusinessPaymentSettings
Business owner payment configuration:
```
/src/pages/BusinessPaymentSettings.tsx
```

### PlatformCommissionsPage
Infrastructure owner platform analytics:
```
/src/pages/PlatformCommissionsPage.tsx
```

## 🔄 Payment Flow

1. **Order Creation**
   - Customer places order
   - Order total calculated

2. **Payment Initiation**
   - Customer selects payment method (TON/Stars)
   - Payment transaction created
   - Status: `pending`

3. **Payment Confirmation**
   - Customer sends crypto to escrow
   - Blockchain transaction confirmed
   - Status: `confirmed`

4. **Delivery Completion**
   - Driver delivers order
   - Order marked as `delivered`

5. **Fund Release**
   - Payment automatically released from escrow
   - Commission split executed:
     - 70% → Business wallet
     - 20% → Driver balance
     - 10% → Platform commission
   - Status: `released`

6. **Driver Withdrawal**
   - Driver requests payout
   - Funds transferred to driver's wallet
   - Payout status: `completed`

## 💡 Usage Examples

### Basic Checkout
```tsx
import { useNavigate } from 'react-router-dom';
import { PaymentMethodSelector } from '@/components/payments';

function OrderCheckout({ order }) {
  const navigate = useNavigate();

  return (
    <PaymentMethodSelector
      orderId={order.id}
      businessId={order.business_id}
      amount={order.total_amount}
      onSuccess={(paymentId) => {
        console.log('Payment successful!', paymentId);
        navigate(`/orders/${order.id}`);
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
        alert(`Payment failed: ${error}`);
      }}
    />
  );
}
```

### Driver Dashboard
```tsx
import { DriverPayoutDashboard } from '@/components/payments';

function DriverEarnings() {
  const { user } = useAuth();

  return (
    <DriverPayoutDashboard
      driverId={user.id}
      businessId={user.currentBusiness}
    />
  );
}
```

### Business Bot Setup
```tsx
import { TelegramBotSetup } from '@/components/payments';

function BusinessSettings() {
  const { business } = useBusiness();

  return (
    <TelegramBotSetup businessId={business.id} />
  );
}
```

## 🧪 Testing

### Test with Mock Data
1. Create test order in database
2. Navigate to `/checkout?orderId=test-order-id`
3. Select payment method
4. Connect TON wallet (testnet)
5. Complete payment flow

### Test Driver Payouts
1. Create completed orders with driver assigned
2. Navigate to `/driver/earnings`
3. View accumulated balance
4. Request test payout

### Test Commission Tracking
1. Create payments with released status
2. Navigate to `/business/payments`
3. View commission ledger
4. Claim commissions

## 🚀 Deployment

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Migration
Run migrations in order:
1. `create_orders_delivery_system_fixed.sql`
2. `create_telegram_ton_payment_system.sql`

### Edge Functions
Deploy all functions:
```bash
# Functions are already deployed via Supabase CLI
# payment-ton-create
# payment-ton-release
# payment-stars-create
# driver-payout-request
```

## 📱 Telegram Bot Setup

1. **Create Bot**
   - Message @BotFather
   - `/newbot` command
   - Copy bot token

2. **Configure Bot**
   - Navigate to Business Settings
   - Enter bot token
   - Set welcome message
   - Enable Stars payments (optional)

3. **Set Webhook**
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook
   ?url=https://your-domain.com/api/telegram-webhook
   ```

4. **Enable Stars**
   - Contact @BotFather
   - `/mybots` → Select your bot
   - Payments → Stars
   - Enter merchant info

## 🎯 Next Steps

### Production Deployment
- [ ] Deploy TON smart contracts for real escrow
- [ ] Configure exchange rate oracle
- [ ] Set up Telegram webhook
- [ ] Enable Stars merchant account
- [ ] Add transaction monitoring
- [ ] Implement fraud detection

### Enhancements
- [ ] Multi-currency support
- [ ] Batch payout processing
- [ ] Commission withdrawal automation
- [ ] Payment analytics dashboard
- [ ] Refund workflows
- [ ] Dispute resolution

## 📝 License

Part of the delivery platform ecosystem.

## 🤝 Support

For issues or questions:
- Check database logs for transaction errors
- Verify RLS policies for access issues
- Test with Supabase local development
- Review Edge Function logs

---

Built with ❤️ using React, TypeScript, Supabase, and TON blockchain
