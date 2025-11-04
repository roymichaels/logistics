// English translations
export const english = {
  // Navigation
  dashboard: 'Dashboard',
  stats: 'Statistics',
  orders: 'Orders',
  products: 'Products',
  tasks: 'Tasks',
  deliveries: 'Deliveries',
  warehouse: 'Warehouse',
  sales: 'Sales',
  customers: 'Customers',
  reports: 'Reports',
  settings: 'Settings',
  businesses: 'Businesses',
  my_stats: 'My Stats',
  inventory: 'Inventory',
  incoming: 'Incoming',
  restock_requests: 'Restock Requests',
  logs: 'Activity Log',
  warehouse_dashboard: 'Warehouse Hub',
  manager_inventory: 'Manager Inventory',
  my_deliveries: 'My Deliveries',
  my_inventory: 'My Inventory',
  my_zones: 'My Zones',
  driver_status: 'Driver Status',
  dispatch_board: 'Dispatch Board',

  // Roles
  owner: 'Owner',
  businessOwner: 'Business Owner',
  manager: 'Manager',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  warehouse_worker: 'Warehouse Worker',
  sales_rep: 'Sales Representative',
  customer_service: 'Customer Service',
  user: 'User',

  // Business context
  switched: 'Switched to',
  selectBusiness: 'Select Business',
  ownership: 'Ownership',
  primary: 'Primary',

  // Common actions
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  search: 'Search',
  filter: 'Filter',
  refresh: 'Refresh',

  // Status
  new: 'New',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',

  // Priority
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',

  // Time
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  this_month: 'This Month',

  // Messages
  loading: 'Loading...',
  no_data: 'No Data',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Information',

  // Greetings
  good_morning: 'Good Morning',
  good_afternoon: 'Good Afternoon',
  good_evening: 'Good Evening',

  // Dashboard
  total_orders: 'Total Orders',
  pending_tasks: 'Pending Tasks',
  completed_today: 'Completed Today',
  active_deliveries: 'Active Deliveries',
  products_in_stock: 'Products in Stock',

  // Forms
  customer_name: 'Customer Name',
  phone: 'Phone',
  address: 'Address',
  product_name: 'Product Name',
  quantity: 'Quantity',
  price: 'Price',
  notes: 'Notes',
  due_date: 'Due Date',

  // Notifications
  new_order: 'New Order',
  order_updated: 'Order Updated',
  task_assigned: 'Task Assigned',
  delivery_completed: 'Delivery Completed',

  // Communications
  group_chats: 'Group Chats',
  channels: 'Channels',
  announcements: 'Announcements',
  updates: 'Updates',
  alerts: 'Alerts',

  // Errors
  errors: {
    loadFailed: 'Load Failed',
    switchFailed: 'Switch Failed',
    saveFailed: 'Save Failed'
  },

  // Common
  common: {
    loading: 'Loading...',
    switched: 'Switched to',
    selectBusiness: 'Select Business',
    ownership: 'Ownership',
    primary: 'Primary'
  },

  // Role labels
  roles: {
    infrastructureOwner: 'Infrastructure Owner',
    businessOwner: 'Business Owner',
    manager: 'Manager',
    dispatcher: 'Dispatcher',
    driver: 'Driver',
    warehouse: 'Warehouse Worker',
    sales: 'Sales Representative',
    customerService: 'Customer Service'
  },

  // Landing Page
  landing: {
    title: 'UndergroundLab - Advanced Business Management Platform',
    subtitle: 'Multi-tenant platform for complete business management',
    description: 'Logistics, communication, inventory, teams, and more - all in one place',
    getStarted: 'Get Started',
    signIn: 'Sign In',

    features: {
      title: 'Platform Capabilities',

      orderManagement: {
        title: 'Order Management',
        description: 'Real-time order tracking, automatic status updates, and fast order creation'
      },
      deliveryManagement: {
        title: 'Delivery Management',
        description: 'Driver assignment, optimal route planning, and GPS tracking'
      },
      inventoryManagement: {
        title: 'Inventory Management',
        description: 'Accurate inventory tracking, low stock alerts, and restock requests'
      },

      realtimeChat: {
        title: 'Real-time Communication',
        description: 'End-to-end encrypted chat, team channels, and work groups'
      },
      encryptedMessaging: {
        title: 'Secure Messaging',
        description: 'Full encryption of all communications with file and image support'
      },
      channels: {
        title: 'Channels & Groups',
        description: 'Communication channels for teams, updates, and organizational announcements'
      },

      multiTenant: {
        title: 'Multi-Business',
        description: 'Manage multiple businesses in one system with complete data separation'
      },
      infrastructure: {
        title: 'Shared Infrastructure',
        description: 'Build a shared logistics infrastructure for multiple businesses'
      },

      web3Auth: {
        title: 'Web3 Authentication',
        description: 'Login with Ethereum, Solana, or Telegram - your choice'
      },
      offlineFirst: {
        title: 'Offline-First',
        description: 'Continue working without internet with automatic sync'
      },

      userManagement: {
        title: 'User Management',
        description: 'Custom roles, advanced permissions, and secure authentication'
      },
      analytics: {
        title: 'Reports & Analytics',
        description: 'Real-time business insights, detailed reports, and performance metrics'
      },

      security: {
        title: 'Advanced Security',
        description: 'Full encryption, role-based access control, and audit tracking'
      },
      notifications: {
        title: 'Smart Notifications',
        description: 'Real-time updates on every important action in the system'
      }
    },

    platformCapabilities: {
      title: 'Multi-Purpose Platform',
      subtitle: 'One system for all business needs',

      logistics: {
        title: 'Logistics & Deliveries',
        description: 'Complete management of orders, deliveries, drivers, and routes'
      },
      communication: {
        title: 'Communication & Teams',
        description: 'Encrypted chat, channels, work groups, and notifications'
      },
      business: {
        title: 'Business Management',
        description: 'Inventory, products, users, reports, and business insights'
      },
      infrastructure: {
        title: 'Shared Infrastructure',
        description: 'Build a shared logistics network for multiple businesses'
      }
    },

    technology: {
      title: 'Advanced Technology',

      web3: {
        title: 'Web3 Authentication',
        description: 'Ethereum, Solana, Telegram'
      },
      realtime: {
        title: 'Real-time',
        description: 'Instant updates and synchronization'
      },
      offline: {
        title: 'Offline-First',
        description: 'Work without internet connection'
      },
      encrypted: {
        title: 'Full Encryption',
        description: 'Highest level of security'
      },
      mobile: {
        title: 'Fully Responsive',
        description: 'Works on any device'
      },
      telegram: {
        title: 'Telegram Integration',
        description: 'Built-in Mini App'
      }
    },

    userRoles: {
      title: 'Who Uses the Platform?',

      infrastructureOwner: 'Infrastructure Owner',
      infrastructureOwnerDesc: 'Manage shared infrastructure for multiple businesses',

      businessOwner: 'Business Owner',
      businessOwnerDesc: 'Full management of business and all activities',

      manager: 'Manager',
      managerDesc: 'Supervision, planning, and activity coordination',

      dispatcher: 'Dispatcher',
      dispatcherDesc: 'Delivery management and driver coordination',

      driver: 'Driver',
      driverDesc: 'Execute deliveries and update status',

      warehouse: 'Warehouse Worker',
      warehouseDesc: 'Inventory management and goods handling',

      sales: 'Sales Representative',
      salesDesc: 'Order creation and customer management',

      support: 'Support',
      supportDesc: 'Customer service and problem solving'
    },

    businessTypes: {
      title: 'Business Types',
      subtitle: 'The platform suits any type of business',

      logistics: 'Delivery Companies',
      retail: 'Retail & Commerce',
      food: 'Restaurants & Food',
      services: 'Services & Businesses',
      custom: 'Custom Solutions'
    },

    cta: {
      title: 'Ready to Start?',
      description: 'Join the advanced platform for business and logistics management',
      button: 'Sign In',
      createBusiness: 'Create New Business',
      joinTeam: 'Join Team'
    },

    footer: {
      secure: 'Fully Secure',
      fast: 'Fast & Efficient',
      mobile: 'Mobile Support',
      realtime: 'Real-time',
      encrypted: 'End-to-end Encrypted',
      offline: 'Works Offline',
      copyright: 'All Rights Reserved'
    }
  },

  // Login Page
  login: {
    welcome: 'Welcome',
    subtitle: 'Sign in to your account',
    chooseMethod: 'Choose login method:',
    signInWith: 'Sign in with',
    ethereum: 'Ethereum',
    solana: 'Solana',
    telegram: 'Telegram',
    backToOptions: 'Back to Options',
    authenticating: 'Authenticating...',
    continueWith: 'Continue with',
    authDescription: 'Authenticate using your account',
    termsAgreement: 'By signing in, you agree to our Terms of Service and Privacy Policy',
    errors: {
      authFailed: 'Authentication failed',
      ethereumFailed: 'Ethereum authentication failed',
      solanaFailed: 'Solana authentication failed',
      telegramFailed: 'Telegram authentication failed'
    }
  },

  // Onboarding
  onboarding: {
    hub: {
      title: 'Welcome to the System!',
      subtitle: 'Choose the path that suits you to get started',
      businessOwner: {
        title: 'Create New Business',
        subtitle: 'I am a business owner',
        description: 'Create and manage your business with a professional logistics system'
      },
      teamMember: {
        title: 'Join a Team',
        subtitle: 'I am a driver, warehouse worker, or team member',
        description: 'Join an existing organization and start working immediately'
      },
      continue: 'Continue',
      skip: 'Skip for Now',
      info: 'You can always change your settings and role from the settings page'
    },
    businessOwner: {
      step1: 'Choose Business Type',
      step2: 'Business Details',
      step3: 'Branding & Design',
      completing: 'Creating business...',
      businessName: 'Business Name (English)',
      businessNameHebrew: 'Business Name (Hebrew)',
      orderPrefix: 'Order Number Prefix',
      colors: 'Choose Brand Colors',
      preview: 'Preview',
      back: 'Back',
      next: 'Continue',
      create: 'Create Business'
    },
    teamMember: {
      title: 'Choose Your Role',
      subtitle: 'Which role interests you?',
      roleDetails: 'Role Overview',
      responsibilities: 'Main Responsibilities and Tasks',
      requirements: 'Requirements and Skills',
      submit: 'Submit Application',
      submitting: 'Submitting application...',
      info: 'Your application will be sent to the business manager for approval. You will receive a notification once approved and can start working.'
    }
  }
};

export const roleNames = {
  user: 'User',
  infrastructure_owner: 'Infrastructure Owner',
  business_owner: 'Business Owner',
  owner: 'Owner',
  manager: 'Manager',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  warehouse: 'Warehouse Worker',
  sales: 'Sales Representative',
  customer_service: 'Customer Service'
};

export const roleIcons = {
  user: '👤',
  infrastructure_owner: '🏛️',
  business_owner: '👑',
  owner: '👑',
  manager: '🎁',
  dispatcher: '📋',
  driver: '🚚',
  warehouse: '📦',
  sales: '💼',
  customer_service: '🎧'
};

// LTR support for English
export const isRTL = false;

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}
