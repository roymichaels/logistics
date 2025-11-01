// Hebrew translations and RTL support
export const hebrew = {
  // Navigation
  dashboard: 'לוח בקרה',
  stats: 'סטטיסטיקות',
  orders: 'הזמנות',
  products: 'מוצרים',
  tasks: 'משימות',
  deliveries: 'משלוחים',
  warehouse: 'מחסן',
  sales: 'מכירות',
  customers: 'לקוחות',
  reports: 'דוחות',
  settings: 'הגדרות',
  businesses: 'עסקים',
  my_stats: 'הנתונים שלי',
  inventory: 'מלאי',
  incoming: 'כניסות',
  restock_requests: 'בקשות חידוש',
  logs: 'יומן פעילות',
  warehouse_dashboard: 'מרכז מחסן',
  manager_inventory: 'מלאי ניהולי',
  my_deliveries: 'המשלוחים שלי',
  my_inventory: 'המלאי שלי',
  my_zones: 'האזורים שלי',
  driver_status: 'סטטוס נהג',
  dispatch_board: 'מוקד תפעול',
  
  // Roles
  owner: 'בעלים',
  businessOwner: 'בעל עסק',
  manager: 'מנהל',
  dispatcher: 'מוקדן',
  driver: 'נהג',
  warehouse_worker: 'עובד מחסן',
  sales_rep: 'איש מכירות',
  customer_service: 'שירות לקוחות',
  user: 'משתמש',

  // Business context
  switched: 'עבר אל',
  selectBusiness: 'בחר עסק',
  ownership: 'בעלות',
  primary: 'ראשי',
  
  // Common actions
  create: 'צור',
  edit: 'ערוך',
  delete: 'מחק',
  save: 'שמור',
  cancel: 'בטל',
  confirm: 'אשר',
  search: 'חפש',
  filter: 'סנן',
  refresh: 'רענן',
  
  // Status
  new: 'חדש',
  pending: 'ממתין',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  cancelled: 'בוטל',
  confirmed: 'אושר',
  preparing: 'בהכנה',
  ready: 'מוכן',
  out_for_delivery: 'יצא למשלוח',
  delivered: 'נמסר',
  
  // Priority
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  urgent: 'דחוף',
  
  // Time
  today: 'היום',
  yesterday: 'אתמול',
  tomorrow: 'מחר',
  this_week: 'השבוע',
  this_month: 'החודש',
  
  // Messages
  loading: 'טוען...',
  no_data: 'אין נתונים',
  error: 'שגיאה',
  success: 'הצלחה',
  warning: 'אזהרה',
  info: 'מידע',
  
  // Greetings
  good_morning: 'בוקר טוב',
  good_afternoon: 'צהריים טובים',
  good_evening: 'ערב טוב',
  
  // Dashboard
  total_orders: 'סה"כ הזמנות',
  pending_tasks: 'משימות ממתינות',
  completed_today: 'הושלמו היום',
  active_deliveries: 'משלוחים פעילים',
  products_in_stock: 'מוצרים במלאי',
  
  // Forms
  customer_name: 'שם לקוח',
  phone: 'טלפון',
  address: 'כתובת',
  product_name: 'שם מוצר',
  quantity: 'כמות',
  price: 'מחיר',
  notes: 'הערות',
  due_date: 'תאריך יעד',
  
  // Notifications
  new_order: 'הזמנה חדשה',
  order_updated: 'הזמנה עודכנה',
  task_assigned: 'משימה הוקצתה',
  delivery_completed: 'משלוח הושלם',
  
  // Communications
  group_chats: 'קבוצות צ\'אט',
  channels: 'ערוצים',
  announcements: 'הודעות',
  updates: 'עדכונים',
  alerts: 'התראות',

  // Errors
  errors: {
    loadFailed: 'טעינה נכשלה',
    switchFailed: 'מעבר נכשל',
    saveFailed: 'שמירה נכשלה'
  },

  // Common
  common: {
    loading: 'טוען...',
    switched: 'עבר אל',
    selectBusiness: 'בחר עסק',
    ownership: 'בעלות',
    primary: 'ראשי'
  },

  // Role labels
  roles: {
    infrastructureOwner: 'בעל תשתית',
    businessOwner: 'בעל עסק',
    manager: 'מנהל',
    dispatcher: 'מוקדן',
    driver: 'נהג',
    warehouse: 'עובד מחסן',
    sales: 'איש מכירות',
    customerService: 'שירות לקוחות'
  },

  // Landing Page
  landing: {
    title: 'מערכת לוגיסטיקה חכמה',
    subtitle: 'ניהול מתקדם של הזמנות, משלוחים ומלאי בזמן אמת',
    description: 'פתרון מקצועי לעסקים מכל הגדלים',
    getStarted: 'התחל עכשיו',
    signIn: 'כניסה למערכת',
    features: {
      title: 'יכולות מתקדמות',
      orderManagement: {
        title: 'ניהול הזמנות',
        description: 'מעקב אחר הזמנות בזמן אמת, עדכוני סטטוס אוטומטיים ויצירת הזמנות מהירה'
      },
      deliveryManagement: {
        title: 'ניהול משלוחים',
        description: 'הקצאת משלוחים לנהגים, תכנון מסלולים אופטימלי ומעקב GPS'
      },
      inventoryManagement: {
        title: 'ניהול מלאי',
        description: 'מעקב מלאי מדויק, התראות על מלאי נמוך ובקשות חידוש מלאי'
      },
      userManagement: {
        title: 'ניהול משתמשים',
        description: 'תפקידים מותאמים אישית, הרשאות מתקדמות ומערכת אימות מאובטחת'
      },
      analytics: {
        title: 'דוחות וניתוחים',
        description: 'תובנות עסקיות בזמן אמת, דוחות מפורטים ומדדי ביצועים'
      },
      security: {
        title: 'אבטחה מתקדמת',
        description: 'הצפנה מלאה, בקרת גישה מבוססת תפקידים ומעקב אודיט'
      }
    },
    userRoles: {
      title: 'מי משתמש במערכת?',
      businessOwner: 'בעל עסק',
      businessOwnerDesc: 'ניהול מלא של העסק',
      manager: 'מנהל',
      managerDesc: 'פיקוח ותכנון',
      dispatcher: 'דיספצ\'ר',
      dispatcherDesc: 'ניהול משלוחים',
      driver: 'נהג',
      driverDesc: 'ביצוע משלוחים',
      warehouse: 'מחסנאי',
      warehouseDesc: 'ניהול מלאי',
      sales: 'איש מכירות',
      salesDesc: 'יצירת הזמנות'
    },
    cta: {
      title: 'מוכנים להתחיל?',
      description: 'הצטרפו למערכת הניהול הלוגיסטית המתקדמת ביותר',
      button: 'כניסה למערכת'
    },
    footer: {
      secure: 'מאובטח לחלוטין',
      fast: 'מהיר ויעיל',
      mobile: 'תומך במובייל',
      copyright: 'כל הזכויות שמורות'
    }
  },

  // Login Page
  login: {
    welcome: 'ברוכים הבאים',
    subtitle: 'היכנסו לחשבון שלכם',
    chooseMethod: 'בחרו שיטת התחברות:',
    signInWith: 'התחברות עם',
    ethereum: 'Ethereum',
    solana: 'Solana',
    telegram: 'טלגרם',
    backToOptions: 'חזרה לאפשרויות',
    authenticating: 'מאמת...',
    continueWith: 'המשך עם',
    authDescription: 'אימות באמצעות חשבון',
    termsAgreement: 'בהתחברות אתם מסכימים לתנאי השימוש ומדיניות הפרטיות שלנו',
    errors: {
      authFailed: 'האימות נכשל',
      ethereumFailed: 'אימות Ethereum נכשל',
      solanaFailed: 'אימות Solana נכשל',
      telegramFailed: 'אימות טלגרם נכשל'
    }
  },

  // Onboarding
  onboarding: {
    hub: {
      title: 'ברוכים הבאים למערכת!',
      subtitle: 'בחרו את המסלול המתאים לכם כדי להתחיל',
      businessOwner: {
        title: 'יצירת עסק חדש',
        subtitle: 'אני בעל עסק',
        description: 'צור ונהל את העסק שלך עם מערכת לוגיסטיקה מקצועית'
      },
      teamMember: {
        title: 'הצטרפות לצוות',
        subtitle: 'אני נהג, מחסנאי או איש צוות',
        description: 'הצטרף לארגון קיים והתחל לעבוד מיד'
      },
      continue: 'המשך',
      skip: 'דלג לעכשיו',
      info: 'תוכל תמיד לשנות את ההגדרות והתפקיד שלך מדף ההגדרות'
    },
    businessOwner: {
      step1: 'בחר סוג עסק',
      step2: 'פרטי העסק',
      step3: 'מיתוג ועיצוב',
      completing: 'יוצר את העסק...',
      businessName: 'שם העסק (אנגלית)',
      businessNameHebrew: 'שם העסק (עברית)',
      orderPrefix: 'קידומת מספר הזמנה',
      colors: 'בחר צבעי מותג',
      preview: 'תצוגה מקדימה',
      back: 'חזור',
      next: 'המשך',
      create: 'צור עסק'
    },
    teamMember: {
      title: 'בחר את התפקיד שלך',
      subtitle: 'איזה תפקיד מעניין אותך?',
      roleDetails: 'סקירת התפקיד',
      responsibilities: 'אחריות ומשימות עיקריות',
      requirements: 'דרישות ומיומנויות',
      submit: 'שלח בקשה',
      submitting: 'שולח בקשה...',
      info: 'בקשתך תישלח למנהל העסק לאישור. תקבל הודעה ברגע שהבקשה תאושר ותוכל להתחיל לעבוד.'
    }
  }
};

export const roleNames = {
  user: 'משתמש',
  infrastructure_owner: 'בעל תשתית',
  business_owner: 'בעל עסק',
  owner: 'בעלים',
  manager: 'מנהל',
  dispatcher: 'מוקדן',
  driver: 'נהג',
  warehouse: 'עובד מחסן',
  sales: 'איש מכירות',
  customer_service: 'שירות לקוחות'
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

// RTL support
export const isRTL = true;

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}