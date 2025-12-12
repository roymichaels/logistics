export const FRONTEND_SANDBOX = {
  user: {
    id: 'sandbox-user',
    name: 'Sandbox User',
    username: 'sandbox',
    kycStep: 'draft',
    kycStatus: 'pending'
  },
  businesses: [
    { id: 'biz-1', name: 'Sandbox Coffee', role: 'owner' },
    { id: 'biz-2', name: 'Sandbox Market', role: 'manager' }
  ],
  products: [
    { id: 'p-1', name: 'Espresso Beans', price: 39, description: '250g Arabica blend', image: null, category: 'coffee' },
    { id: 'p-2', name: 'Matcha Powder', price: 59, description: 'Ceremonial grade', image: null, category: 'tea' },
    { id: 'p-3', name: 'Cold Brew Bottle', price: 22, description: 'Ready to drink', image: null, category: 'coffee' }
  ],
  categories: [
    { id: 'coffee', name: 'Coffee' },
    { id: 'tea', name: 'Tea' },
    { id: 'ready', name: 'Ready to drink' }
  ],
  orders: [
    { id: 'o-1', total: 120, status: 'processing' },
    { id: 'o-2', total: 89, status: 'delivered' }
  ],
  deliveries: [
    { id: 'd-1', status: 'pending', address: 'Sandbox St 1' },
    { id: 'd-2', status: 'in_transit', address: 'Sandbox St 2' }
  ],
  cart: [],
  kyc: {
    status: 'draft',
    step: 'id',
    idFront: '',
    idBack: '',
    selfie: ''
  }
};
