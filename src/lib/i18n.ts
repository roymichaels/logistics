/**
 * Unified Internationalization (i18n) System
 *
 * Consolidated translation module supporting Hebrew and English
 * with landing page translations integrated.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type Language = 'he' | 'en';

export interface Translations {
  // Navigation
  dashboard: string;
  stats: string;
  orders: string;
  products: string;
  tasks: string;
  deliveries: string;
  warehouse: string;
  sales: string;
  customers: string;
  reports: string;
  settings: string;
  businesses: string;
  my_stats: string;
  inventory: string;
  incoming: string;
  restock_requests: string;
  logs: string;
  warehouse_dashboard: string;
  manager_inventory: string;
  my_deliveries: string;
  my_inventory: string;
  my_zones: string;
  driver_status: string;
  dispatch_board: string;

  // Roles
  owner: string;
  businessOwner: string;
  manager: string;
  dispatcher: string;
  driver: string;
  warehouse_worker: string;
  sales_rep: string;
  customer_service: string;
  user: string;

  // Common namespace
  common: {
    loading: string;
    switched: string;
    selectBusiness: string;
    ownership: string;
    primary: string;
  };

  // Header namespace
  header: {
    myBusinesses: string;
    noBusinesses: string;
    loading: string;
    createBusiness: string;
    becomeDriver: string;
    searchBusiness: string;
    myProfile: string;
    logout: string;
    menu: string;
  };

  // Roles namespace
  roles: {
    infrastructureOwner: string;
    businessOwner: string;
    manager: string;
    dispatcher: string;
    driver: string;
    warehouse: string;
    sales: string;
    customerService: string;
  };

  // Business context (backward compatibility)
  switched: string;
  selectBusiness: string;
  ownership: string;
  primary: string;

  // Common actions
  create: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  confirm: string;
  submit: string;
  search: string;
  filter: string;
  export: string;
  import: string;
  refresh: string;
  back: string;
  next: string;
  previous: string;
  close: string;
  open: string;
  view: string;
  download: string;
  upload: string;
  send: string;
  receive: string;
  approve: string;
  reject: string;
  pending: string;
  completed: string;
  cancelled: string;

  // Common UI states
  loading: string;
  error: string;

  // Login and authentication
  login: {
    welcome: string;
    subtitle: string;
    chooseMethod: string;
    signInWith: string;
    ethereum: string;
    solana: string;
    telegram: string;
    backToOptions: string;
    authDescription: string;
    continueWith: string;
    authenticating: string;
    termsAgreement: string;
    errors: {
      ethereumFailed: string;
      solanaFailed: string;
      telegramFailed: string;
    };
  };

  // Error messages
  errors: {
    loadFailed: string;
    switchFailed: string;
  };

  // Social Media Features
  social: {
    // Feed and Posts
    whatsHappening: string;
    post: string;
    posting: string;
    sharedMedia: string;
    deletePost: string;
    editPost: string;
    postDeleted: string;
    postCreated: string;
    postFailed: string;

    // Interactions
    like: string;
    unlike: string;
    comment: string;
    repost: string;
    unrepost: string;
    share: string;
    bookmark: string;
    unbookmark: string;
    reply: string;

    // Counts and Stats
    likes: string;
    reposts: string;
    comments: string;
    views: string;
    followers: string;
    following: string;
    posts: string;

    // Visibility
    public: string;
    private: string;
    followersOnly: string;
    businessOnly: string;

    // Media
    addMedia: string;
    addImageOrVideo: string;
    removeMedia: string;
    uploadingMedia: string;
    mediaUploadFailed: string;

    // Repost Modal
    repostTitle: string;
    addComment: string;
    addCommentOptional: string;
    cancel: string;

    // Sidebar Sections
    trending: string;
    whoToFollow: string;
    showMore: string;
    search: string;
    searchPlaceholder: string;
    noTrendingYet: string;

    // User Actions
    follow: string;
    unfollow: string;
    followingButton: string;
    followBack: string;
    block: string;
    unblock: string;
    mute: string;
    unmute: string;
    report: string;

    // Recommendations
    suggestedForYou: string;
    peopleYouMayKnow: string;
    similarPosts: string;
    relatedContent: string;
    basedOnYourInterests: string;
    mutualFollowers: string;
    dismiss: string;
    notInterested: string;

    // Feed Filters
    forYou: string;
    followingFeed: string;
    latest: string;
    topPosts: string;

    // Time Formatting
    now: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    weeksAgo: string;

    // Character Count
    characterLimit: string;
    charactersRemaining: string;

    // Hashtags and Mentions
    hashtag: string;
    mention: string;
    trendingHashtags: string;

    // Errors and States
    loadingFeed: string;
    noPostsYet: string;
    startFollowing: string;
    createFirstPost: string;
    somethingWentWrong: string;
    tryAgain: string;

    // Accessibility
    closeModal: string;
    openMenu: string;
    userAvatar: string;
    postImage: string;
    postVideo: string;
  };

  // Landing page translations
  landing: LandingTranslations;

  [key: string]: string | any;
}

export interface LandingTranslations {
  title: string;
  subtitle: string;
  description: string;
  getStarted: string;
  signIn: string;

  features: {
    title: string;
    orderManagement: { title: string; description: string };
    deliveryManagement: { title: string; description: string };
    inventoryManagement: { title: string; description: string };
    realtimeChat: { title: string; description: string };
    encryptedMessaging: { title: string; description: string };
    channels: { title: string; description: string };
    multiTenant: { title: string; description: string };
    infrastructure: { title: string; description: string };
    web3Auth: { title: string; description: string };
    offlineFirst: { title: string; description: string };
    userManagement: { title: string; description: string };
    analytics: { title: string; description: string };
    security: { title: string; description: string };
    notifications: { title: string; description: string };
  };

  platformCapabilities: {
    title: string;
    subtitle: string;
    logistics: { title: string; description: string };
    communication: { title: string; description: string };
    business: { title: string; description: string };
    infrastructure: { title: string; description: string };
  };

  technology: {
    title: string;
    web3: { title: string; description: string };
    realtime: { title: string; description: string };
    offline: { title: string; description: string };
    encrypted: { title: string; description: string };
    mobile: { title: string; description: string };
    telegram: { title: string; description: string };
  };

  userRoles: {
    title: string;
    infrastructureOwner: string;
    infrastructureOwnerDesc: string;
    businessOwner: string;
    businessOwnerDesc: string;
    manager: string;
    managerDesc: string;
    dispatcher: string;
    dispatcherDesc: string;
    driver: string;
    driverDesc: string;
    warehouse: string;
    warehouseDesc: string;
    sales: string;
    salesDesc: string;
    support: string;
    supportDesc: string;
  };

  businessTypes: {
    title: string;
    subtitle: string;
    logistics: string;
    retail: string;
    food: string;
    services: string;
    custom: string;
  };

  cta: {
    title: string;
    description: string;
    button: string;
    createBusiness: string;
    joinTeam: string;
  };

  footer: {
    secure: string;
    fast: string;
    mobile: string;
    realtime: string;
    encrypted: string;
    offline: string;
    copyright: string;
  };
}

// ============================================================================
// Hebrew Translations
// ============================================================================

const hebrewTranslations: Translations = {
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

  // Common namespace for shared UI elements
  common: {
    loading: 'טוען...',
    switched: 'עבר אל',
    selectBusiness: 'בחר עסק',
    ownership: 'בעלות',
    primary: 'ראשי',
  },

  // Header translations
  header: {
    myBusinesses: 'העסקים שלי',
    noBusinesses: 'אין עסקים',
    loading: 'טוען...',
    createBusiness: 'צור עסק',
    becomeDriver: 'הפוך לנהג',
    searchBusiness: 'חפש עסק',
    myProfile: 'הפרופיל שלי',
    logout: 'התנתק',
    menu: 'תפריט',
  },

  // Roles namespace for role labels
  roles: {
    infrastructureOwner: 'בעל תשתית',
    businessOwner: 'בעל עסק',
    manager: 'מנהל',
    dispatcher: 'מוקדן',
    driver: 'נהג',
    warehouse: 'מחסנאי',
    sales: 'איש מכירות',
    customerService: 'שירות לקוחות',
  },

  // Business context (kept for backward compatibility)
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
  submit: 'שלח',
  search: 'חפש',
  filter: 'סנן',
  export: 'ייצא',
  import: 'ייבא',
  refresh: 'רענן',
  back: 'חזור',
  next: 'הבא',
  previous: 'הקודם',
  close: 'סגור',
  open: 'פתח',
  view: 'צפה',
  download: 'הורד',
  upload: 'העלה',
  send: 'שלח',
  receive: 'קבל',
  approve: 'אשר',
  reject: 'דחה',
  pending: 'ממתין',
  completed: 'הושלם',
  cancelled: 'בוטל',

  // Common UI states
  loading: 'טוען...',
  error: 'שגיאה',

  // Login and authentication
  login: {
    welcome: 'ברוכים הבאים',
    subtitle: 'התחבר לחשבונך',
    chooseMethod: 'בחר שיטת אימות:',
    signInWith: 'התחבר עם',
    ethereum: 'Ethereum',
    solana: 'Solana',
    telegram: 'Telegram',
    backToOptions: 'חזור לאפשרויות',
    authDescription: 'התחבר בצורה מאובטחת באמצעות',
    continueWith: 'המשך עם',
    authenticating: 'מאמת...',
    termsAgreement: 'בהמשך, אתה מסכים לתנאי השימוש ומדיניות הפרטיות שלנו',
    errors: {
      ethereumFailed: 'אימות Ethereum נכשל. נסה שנית.',
      solanaFailed: 'אימות Solana נכשל. נסה שנית.',
      telegramFailed: 'אימות Telegram נכשל. נסה שנית.',
    },
  },

  // Error messages
  errors: {
    loadFailed: 'טעינת הנתונים נכשלה',
    switchFailed: 'מעבר בין עסקים נכשל',
  },

  // Social Media Features
  social: {
    // Feed and Posts
    whatsHappening: 'מה קורה?',
    post: 'פרסם',
    posting: 'מפרסם...',
    sharedMedia: 'מדיה משותפת',
    deletePost: 'מחק פוסט',
    editPost: 'ערוך פוסט',
    postDeleted: 'הפוסט נמחק בהצלחה',
    postCreated: 'הפוסט נוצר בהצלחה',
    postFailed: 'יצירת הפוסט נכשלה',

    // Interactions
    like: 'לייק',
    unlike: 'ביטול לייק',
    comment: 'תגובה',
    repost: 'שיתוף מחדש',
    unrepost: 'ביטול שיתוף',
    share: 'שתף',
    bookmark: 'שמור',
    unbookmark: 'ביטול שמירה',
    reply: 'הגב',

    // Counts and Stats
    likes: 'לייקים',
    reposts: 'שיתופים',
    comments: 'תגובות',
    views: 'צפיות',
    followers: 'עוקבים',
    following: 'עוקב אחרי',
    posts: 'פוסטים',

    // Visibility
    public: 'ציבורי',
    private: 'פרטי',
    followersOnly: 'עוקבים בלבד',
    businessOnly: 'עסק בלבד',

    // Media
    addMedia: 'הוסף מדיה',
    addImageOrVideo: 'הוסף תמונה או וידאו',
    removeMedia: 'הסר',
    uploadingMedia: 'מעלה מדיה',
    mediaUploadFailed: 'העלאת המדיה נכשלה',

    // Repost Modal
    repostTitle: 'שתף מחדש',
    addComment: 'הוסף תגובה',
    addCommentOptional: 'הוסף תגובה (אופציונלי)',
    cancel: 'ביטול',

    // Sidebar Sections
    trending: 'טרנדים',
    whoToFollow: 'מי לעקוב',
    showMore: 'הצג עוד',
    search: 'חיפוש',
    searchPlaceholder: 'חפש',
    noTrendingYet: 'עדיין אין טרנדים',

    // User Actions
    follow: 'עקוב',
    unfollow: 'הפסק לעקוב',
    followingButton: 'עוקב',
    followBack: 'עקוב בחזרה',
    block: 'חסום',
    unblock: 'בטל חסימה',
    mute: 'השתק',
    unmute: 'בטל השתקה',
    report: 'דווח',

    // Recommendations
    suggestedForYou: 'מומלץ בשבילך',
    peopleYouMayKnow: 'אנשים שאולי אתה מכיר',
    similarPosts: 'פוסטים דומים',
    relatedContent: 'תוכן קשור',
    basedOnYourInterests: 'מבוסס על תחומי העניין שלך',
    mutualFollowers: 'עוקבים משותפים',
    dismiss: 'התעלם',
    notInterested: 'לא מעוניין',

    // Feed Filters
    forYou: 'בשבילך',
    followingFeed: 'עוקבים',
    latest: 'אחרונים',
    topPosts: 'פוסטים מובילים',

    // Time Formatting
    now: 'עכשיו',
    minutesAgo: 'דקות',
    hoursAgo: 'שעות',
    daysAgo: 'ימים',
    weeksAgo: 'שבועות',

    // Character Count
    characterLimit: 'מגבלת תווים',
    charactersRemaining: 'תווים נותרו',

    // Hashtags and Mentions
    hashtag: 'האשטאג',
    mention: 'אזכור',
    trendingHashtags: 'האשטאגים טרנדיים',

    // Errors and States
    loadingFeed: 'טוען פיד...',
    noPostsYet: 'עדיין אין פוסטים',
    startFollowing: 'התחל לעקוב אחרי אנשים',
    createFirstPost: 'צור את הפוסט הראשון שלך!',
    somethingWentWrong: 'משהו השתבש',
    tryAgain: 'נסה שוב',

    // Accessibility
    closeModal: 'סגור חלון',
    openMenu: 'פתח תפריט',
    userAvatar: 'תמונת משתמש',
    postImage: 'תמונת פוסט',
    postVideo: 'וידאו פוסט',
  },

  // Landing page translations - will be added below
  landing: {} as LandingTranslations,
};

const hebrewLanding: LandingTranslations = {
  title: 'UndergroundLab - פלטפורמת ניהול עסקי מתקדמת',
  subtitle: 'פלטפורמה רב-עסקית לניהול מלא של כל היבטי העסק',
  description: 'לוגיסטיקה, תקשורת, מלאי, צוותים ועוד - הכל במקום אחד',
  getStarted: 'התחל עכשיו',
  signIn: 'כניסה למערכת',

  features: {
    title: 'יכולות הפלטפורמה',
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
    realtimeChat: {
      title: 'תקשורת בזמן אמת',
      description: 'צ\'אט מוצפן מקצה לקצה, ערוצי צוות וקבוצות עבודה'
    },
    encryptedMessaging: {
      title: 'הודעות מאובטחות',
      description: 'הצפנה מלאה של כל ההתכתבות עם תמיכה בקבצים ותמונות'
    },
    channels: {
      title: 'ערוצים וקבוצות',
      description: 'ערוצי תקשורת לצוותים, עדכונים והודעות ארגוניות'
    },
    multiTenant: {
      title: 'ריבוי עסקים',
      description: 'ניהול מספר עסקים במערכת אחת עם הפרדה מלאה של נתונים'
    },
    infrastructure: {
      title: 'תשתית משותפת',
      description: 'בניית תשתית לוגיסטית משותפת למספר עסקים'
    },
    web3Auth: {
      title: 'אימות Web3',
      description: 'התחברות עם Ethereum, Solana או Telegram - בחירה חופשית'
    },
    offlineFirst: {
      title: 'עבודה לא מקוונת',
      description: 'המשך לעבוד גם ללא אינטרנט עם סנכרון אוטומטי'
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
    },
    notifications: {
      title: 'התראות חכמות',
      description: 'עדכונים בזמן אמת על כל פעולה חשובה במערכת'
    }
  },

  platformCapabilities: {
    title: 'פלטפורמה רב-תכליתית',
    subtitle: 'מערכת אחת לכל צרכי העסק',
    logistics: {
      title: 'לוגיסטיקה ומשלוחים',
      description: 'ניהול מלא של הזמנות, משלוחים, נהגים ומסלולים'
    },
    communication: {
      title: 'תקשורת וצוותים',
      description: 'צ\'אט מוצפן, ערוצים, קבוצות עבודה והתראות'
    },
    business: {
      title: 'ניהול עסקי',
      description: 'מלאי, מוצרים, משתמשים, דוחות ותובנות עסקיות'
    },
    infrastructure: {
      title: 'תשתית משותפת',
      description: 'בניית רשת לוגיסטית משותפת למספר עסקים'
    }
  },

  technology: {
    title: 'טכנולוגיה מתקדמת',
    web3: {
      title: 'אימות Web3',
      description: 'Ethereum, Solana, Telegram'
    },
    realtime: {
      title: 'זמן אמת',
      description: 'עדכונים מיידיים וסנכרון'
    },
    offline: {
      title: 'Offline-First',
      description: 'עבודה ללא חיבור לאינטרנט'
    },
    encrypted: {
      title: 'הצפנה מלאה',
      description: 'אבטחה ברמה הגבוהה ביותר'
    },
    mobile: {
      title: 'רספונסיבי מלא',
      description: 'עובד על כל מכשיר'
    },
    telegram: {
      title: 'אינטגרציה Telegram',
      description: 'Mini App מובנה'
    }
  },

  userRoles: {
    title: 'מי משתמש בפלטפורמה?',
    infrastructureOwner: 'בעל תשתית',
    infrastructureOwnerDesc: 'ניהול תשתית משותפת למספר עסקים',
    businessOwner: 'בעל עסק',
    businessOwnerDesc: 'ניהול מלא של העסק וכל הפעילות',
    manager: 'מנהל',
    managerDesc: 'פיקוח, תכנון ותיאום פעילות',
    dispatcher: 'דיספצ\'ר',
    dispatcherDesc: 'ניהול משלוחים ותיאום נהגים',
    driver: 'נהג',
    driverDesc: 'ביצוע משלוחים ועדכון סטטוס',
    warehouse: 'מחסנאי',
    warehouseDesc: 'ניהול מלאי וטיפול בסחורה',
    sales: 'איש מכירות',
    salesDesc: 'יצירת הזמנות וניהול לקוחות',
    support: 'תמיכה',
    supportDesc: 'שירות לקוחות ופתרון בעיות'
  },

  businessTypes: {
    title: 'סוגי עסקים',
    subtitle: 'הפלטפורמה מתאימה לכל סוג עסק',
    logistics: 'חברות משלוחים',
    retail: 'קמעונאות ומסחר',
    food: 'מסעדות ומזון',
    services: 'שירותים ועסקים',
    custom: 'התאמה אישית'
  },

  cta: {
    title: 'מוכנים להתחיל?',
    description: 'הצטרפו לפלטפורמה המתקדמת לניהול עסקים ולוגיסטיקה',
    button: 'כניסה למערכת',
    createBusiness: 'צור עסק חדש',
    joinTeam: 'הצטרף לצוות'
  },

  footer: {
    secure: 'מאובטח לחלוטין',
    fast: 'מהיר ויעיל',
    mobile: 'תומך במובייל',
    realtime: 'זמן אמת',
    encrypted: 'מוצפן מקצה לקצה',
    offline: 'עובד ללא אינטרנט',
    copyright: 'כל הזכויות שמורות'
  }
};

// ============================================================================
// English Translations
// ============================================================================

const englishTranslations: Translations = {
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

  // Common namespace for shared UI elements
  common: {
    loading: 'Loading...',
    switched: 'Switched to',
    selectBusiness: 'Select Business',
    ownership: 'Ownership',
    primary: 'Primary',
  },

  // Header translations
  header: {
    myBusinesses: 'My Businesses',
    noBusinesses: 'No Businesses',
    loading: 'Loading...',
    createBusiness: 'Create Business',
    becomeDriver: 'Become Driver',
    searchBusiness: 'Search Business',
    myProfile: 'My Profile',
    logout: 'Logout',
    menu: 'Menu',
  },

  // Roles namespace for role labels
  roles: {
    infrastructureOwner: 'Infrastructure Owner',
    businessOwner: 'Business Owner',
    manager: 'Manager',
    dispatcher: 'Dispatcher',
    driver: 'Driver',
    warehouse: 'Warehouse Worker',
    sales: 'Sales Representative',
    customerService: 'Customer Service',
  },

  // Business context (kept for backward compatibility)
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
  submit: 'Submit',
  search: 'Search',
  filter: 'Filter',
  export: 'Export',
  import: 'Import',
  refresh: 'Refresh',
  back: 'Back',
  next: 'Next',
  previous: 'Previous',
  close: 'Close',
  open: 'Open',
  view: 'View',
  download: 'Download',
  upload: 'Upload',
  send: 'Send',
  receive: 'Receive',
  approve: 'Approve',
  reject: 'Reject',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',

  // Common UI states
  loading: 'Loading...',
  error: 'Error',

  // Login and authentication
  login: {
    welcome: 'Welcome',
    subtitle: 'Sign in to your account',
    chooseMethod: 'Choose authentication method:',
    signInWith: 'Sign in with',
    ethereum: 'Ethereum',
    solana: 'Solana',
    telegram: 'Telegram',
    backToOptions: 'Back to options',
    authDescription: 'Securely authenticate using',
    continueWith: 'Continue with',
    authenticating: 'Authenticating...',
    termsAgreement: 'By continuing, you agree to our Terms of Service and Privacy Policy',
    errors: {
      ethereumFailed: 'Ethereum authentication failed. Please try again.',
      solanaFailed: 'Solana authentication failed. Please try again.',
      telegramFailed: 'Telegram authentication failed. Please try again.',
    },
  },

  // Error messages
  errors: {
    loadFailed: 'Failed to load data',
    switchFailed: 'Failed to switch business',
  },

  // Social Media Features
  social: {
    // Feed and Posts
    whatsHappening: "What's happening?",
    post: 'Post',
    posting: 'Posting...',
    sharedMedia: 'Shared media',
    deletePost: 'Delete post',
    editPost: 'Edit post',
    postDeleted: 'Post deleted successfully',
    postCreated: 'Post created successfully',
    postFailed: 'Failed to create post',

    // Interactions
    like: 'Like',
    unlike: 'Unlike',
    comment: 'Comment',
    repost: 'Repost',
    unrepost: 'Undo repost',
    share: 'Share',
    bookmark: 'Bookmark',
    unbookmark: 'Remove bookmark',
    reply: 'Reply',

    // Counts and Stats
    likes: 'Likes',
    reposts: 'Reposts',
    comments: 'Comments',
    views: 'Views',
    followers: 'Followers',
    following: 'Following',
    posts: 'Posts',

    // Visibility
    public: 'Public',
    private: 'Private',
    followersOnly: 'Followers only',
    businessOnly: 'Business only',

    // Media
    addMedia: 'Add media',
    addImageOrVideo: 'Add image or video',
    removeMedia: 'Remove',
    uploadingMedia: 'Uploading media',
    mediaUploadFailed: 'Media upload failed',

    // Repost Modal
    repostTitle: 'Repost',
    addComment: 'Add a comment',
    addCommentOptional: 'Add a comment (optional)',
    cancel: 'Cancel',

    // Sidebar Sections
    trending: 'Trending',
    whoToFollow: 'Who to follow',
    showMore: 'Show more',
    search: 'Search',
    searchPlaceholder: 'Search',
    noTrendingYet: 'No trending topics yet',

    // User Actions
    follow: 'Follow',
    unfollow: 'Unfollow',
    followingButton: 'Following',
    followBack: 'Follow back',
    block: 'Block',
    unblock: 'Unblock',
    mute: 'Mute',
    unmute: 'Unmute',
    report: 'Report',

    // Recommendations
    suggestedForYou: 'Suggested for you',
    peopleYouMayKnow: 'People you may know',
    similarPosts: 'Similar posts',
    relatedContent: 'Related content',
    basedOnYourInterests: 'Based on your interests',
    mutualFollowers: 'Mutual followers',
    dismiss: 'Dismiss',
    notInterested: 'Not interested',

    // Feed Filters
    forYou: 'For you',
    followingFeed: 'Following',
    latest: 'Latest',
    topPosts: 'Top posts',

    // Time Formatting
    now: 'now',
    minutesAgo: 'm',
    hoursAgo: 'h',
    daysAgo: 'd',
    weeksAgo: 'w',

    // Character Count
    characterLimit: 'Character limit',
    charactersRemaining: 'characters remaining',

    // Hashtags and Mentions
    hashtag: 'Hashtag',
    mention: 'Mention',
    trendingHashtags: 'Trending hashtags',

    // Errors and States
    loadingFeed: 'Loading feed...',
    noPostsYet: 'No posts yet',
    startFollowing: 'Start following people',
    createFirstPost: 'Create your first post!',
    somethingWentWrong: 'Something went wrong',
    tryAgain: 'Try again',

    // Accessibility
    closeModal: 'Close modal',
    openMenu: 'Open menu',
    userAvatar: 'User avatar',
    postImage: 'Post image',
    postVideo: 'Post video',
  },

  // Landing page translations - will be added below
  landing: {} as LandingTranslations,
};

const englishLanding: LandingTranslations = {
  title: 'UndergroundLab - Advanced Business Management Platform',
  subtitle: 'Multi-business platform for complete business management',
  description: 'Logistics, communication, inventory, teams and more - all in one place',
  getStarted: 'Get Started',
  signIn: 'Sign In',

  features: {
    title: 'Platform Capabilities',
    orderManagement: {
      title: 'Order Management',
      description: 'Real-time order tracking, automatic status updates and fast order creation'
    },
    deliveryManagement: {
      title: 'Delivery Management',
      description: 'Driver assignment, optimal route planning and GPS tracking'
    },
    inventoryManagement: {
      title: 'Inventory Management',
      description: 'Accurate inventory tracking, low stock alerts and restock requests'
    },
    realtimeChat: {
      title: 'Real-time Communication',
      description: 'End-to-end encrypted chat, team channels and work groups'
    },
    encryptedMessaging: {
      title: 'Secure Messaging',
      description: 'Full encryption of all correspondence with file and image support'
    },
    channels: {
      title: 'Channels & Groups',
      description: 'Team communication channels, updates and organizational messages'
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
      description: 'Login with Ethereum, Solana or Telegram - your choice'
    },
    offlineFirst: {
      title: 'Offline Mode',
      description: 'Continue working without internet with automatic sync'
    },
    userManagement: {
      title: 'User Management',
      description: 'Custom roles, advanced permissions and secure authentication system'
    },
    analytics: {
      title: 'Reports & Analytics',
      description: 'Real-time business insights, detailed reports and performance metrics'
    },
    security: {
      title: 'Advanced Security',
      description: 'Full encryption, role-based access control and audit tracking'
    },
    notifications: {
      title: 'Smart Notifications',
      description: 'Real-time updates on every important action in the system'
    }
  },

  platformCapabilities: {
    title: 'Versatile Platform',
    subtitle: 'One system for all business needs',
    logistics: {
      title: 'Logistics & Delivery',
      description: 'Complete management of orders, deliveries, drivers and routes'
    },
    communication: {
      title: 'Communication & Teams',
      description: 'Encrypted chat, channels, work groups and notifications'
    },
    business: {
      title: 'Business Management',
      description: 'Inventory, products, users, reports and business insights'
    },
    infrastructure: {
      title: 'Shared Infrastructure',
      description: 'Build a shared logistics network for multiple businesses'
    }
  },

  technology: {
    title: 'Advanced Technology',
    web3: {
      title: 'Web3 Auth',
      description: 'Ethereum, Solana, Telegram'
    },
    realtime: {
      title: 'Real-time',
      description: 'Instant updates and sync'
    },
    offline: {
      title: 'Offline-First',
      description: 'Works without internet'
    },
    encrypted: {
      title: 'Full Encryption',
      description: 'Highest level security'
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
    title: 'Who Uses The Platform?',
    infrastructureOwner: 'Infrastructure Owner',
    infrastructureOwnerDesc: 'Manage shared infrastructure for multiple businesses',
    businessOwner: 'Business Owner',
    businessOwnerDesc: 'Complete business management and all operations',
    manager: 'Manager',
    managerDesc: 'Supervision, planning and coordination',
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
    subtitle: 'The platform fits any business type',
    logistics: 'Delivery Companies',
    retail: 'Retail & Commerce',
    food: 'Restaurants & Food',
    services: 'Services & Business',
    custom: 'Custom Fit'
  },

  cta: {
    title: 'Ready to Start?',
    description: 'Join the advanced platform for business and logistics management',
    button: 'Sign In',
    createBusiness: 'Create New Business',
    joinTeam: 'Join Team'
  },

  footer: {
    secure: 'Completely Secure',
    fast: 'Fast & Efficient',
    mobile: 'Mobile Supported',
    realtime: 'Real-time',
    encrypted: 'End-to-End Encrypted',
    offline: 'Works Offline',
    copyright: 'All Rights Reserved'
  }
};

// ============================================================================
// Translation Service
// ============================================================================

class I18nService {
  private currentLanguage: Language = 'he';
  private listeners: Set<(lang: Language) => void> = new Set();

  setLanguage(lang: Language) {
    if (this.currentLanguage !== lang) {
      this.currentLanguage = lang;
      this.notifyListeners();

      // Update HTML dir attribute
      if (typeof document !== 'undefined') {
        document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
    }
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  isRTL(): boolean {
    return this.currentLanguage === 'he';
  }

  getTranslations(): Translations {
    return this.currentLanguage === 'he' ? hebrewTranslations : englishTranslations;
  }

  getLandingTranslations(): LandingTranslations {
    return this.currentLanguage === 'he' ? hebrewLanding : englishLanding;
  }

  t(key: string): string {
    const translations = this.getTranslations();
    return translations[key] || key;
  }

  subscribe(listener: (lang: Language) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentLanguage));
  }
}

// ============================================================================
// Exports
// ============================================================================

export const i18n = new I18nService();

// Helper functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS'
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

// English formatting functions
function formatCurrencyEN(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDateEN(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

function formatTimeEN(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

// Assign landing translations to main translation objects
hebrewTranslations.landing = hebrewLanding;
englishTranslations.landing = englishLanding;

// Legacy exports for backward compatibility
export const hebrew = {
  ...hebrewTranslations,
  formatCurrency,
  formatDate,
  formatTime,
};

export const english = {
  ...englishTranslations,
  formatCurrency: formatCurrencyEN,
  formatDate: formatDateEN,
  formatTime: formatTimeEN,
};

export const hebrewLandingUpdate = { landing: hebrewLanding };

export const roleNames = {
  infrastructure_owner: i18n.t('owner'),
  business_owner: i18n.t('businessOwner'),
  manager: i18n.t('manager'),
  dispatcher: i18n.t('dispatcher'),
  driver: i18n.t('driver'),
  warehouse: i18n.t('warehouse_worker'),
  sales: i18n.t('sales_rep'),
  customer_service: i18n.t('customer_service'),
  user: i18n.t('user'),
};

export const roleIcons = {
  infrastructure_owner: '👑',
  business_owner: '🏢',
  manager: '👔',
  dispatcher: '📡',
  driver: '🚗',
  warehouse: '📦',
  sales: '💼',
  customer_service: '📞',
  user: '👤',
};
