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
  channels: string;
  profile: string;
  notifications: string;
  chat: string;
  zones: string;
  users: string;

  // Bottom Navigation Actions
  platformActions: string;
  adminActions: string;
  browse: string;
  shop: string;
  cart: string;

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
    noPermission: string;
    failed: string;
    unknownError: string;
  };

  // Success messages
  success: {
    saved: string;
    created: string;
    updated: string;
    deleted: string;
  };

  // Common phrases
  phrases: {
    loadingOrders: string;
    loadingData: string;
    noData: string;
    user: string;
    actions: string;
    menu: string;
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

  // Admin Panel
  admin: {
    title: string;
    overview: string;
    users: string;
    bulk: string;
    export: string;
    systemStats: string;
    totalOrders: string;
    totalProducts: string;
    totalTasks: string;
    activeUsers: string;
    todayOrders: string;
    bulkOperations: string;
    bulkUpdateStatus: string;
    bulkAssignTasks: string;
    bulkUpdatePrices: string;
    markAllRead: string;
    exportOrders: string;
    exportProducts: string;
    dateRange: string;
    from: string;
    to: string;
  };

  // Products
  productsPage: {
    title: string;
    allProducts: string;
    category: string;
    searchProducts: string;
    createProduct: string;
    editProduct: string;
    productName: string;
    description: string;
    price: string;
    stock: string;
    sku: string;
    inStock: string;
    lowStock: string;
    outOfStock: string;
    noProducts: string;
  };

  // Tasks
  tasksPage: {
    title: string;
    myTasks: string;
    allTasks: string;
    createTask: string;
    editTask: string;
    taskTitle: string;
    taskDescription: string;
    assignedTo: string;
    dueDate: string;
    priority: string;
    high: string;
    medium: string;
    low: string;
    status: string;
    inProgress: string;
    noTasks: string;
  };

  // Inventory
  inventoryPage: {
    title: string;
    aggregated: string;
    byLocation: string;
    onHand: string;
    reserved: string;
    damaged: string;
    adjustInventory: string;
    quantity: string;
    reason: string;
    location: string;
    alerts: string;
    noAlerts: string;
  };

  // My Inventory
  myInventoryPage: {
    title: string;
    subtitle: string;
    totalUnits: string;
    saveChanges: string;
    syncing: string;
    loadingInventory: string;
    remove: string;
    quantityInVehicle: string;
    noItemsAssigned: string;
    addNewProduct: string;
    selectProduct: string;
    add: string;
    errorLoadingInventory: string;
    selectProductToAdd: string;
    productNotFound: string;
    cannotSyncInventory: string;
    inventoryUpdated: string;
    updatedAndRemoved: string;
    errorUpdatingInventory: string;
    driverInventoryUpdate: string;
  };

  // Driver Status
  driverStatusPage: {
    title: string;
    available: string;
    delivering: string;
    onBreak: string;
    offShift: string;
    notAvailable: string;
    statusUnavailable: string;
    errorLoadingStatus: string;
    cannotUpdateStatus: string;
    driverLoggedOut: string;
  };

  // Manager Inventory
  managerInventoryPage: {
    title: string;
    subtitle: string;
    lowStockProducts: string;
    pendingApproval: string;
    approvedPending: string;
    alerts: string;
    loadingData: string;
    noData: string;
    available: string;
    allocated: string;
    activeLocations: string;
    alertThreshold: string;
  };

  // Reports
  reportsPage: {
    title: string;
    overview: string;
    sales: string;
    revenue: string;
    orders: string;
    performance: string;
    dateRange: string;
    day: string;
    week: string;
    month: string;
    year: string;
    totalRevenue: string;
    averageOrder: string;
    revenueByDay: string;
    ordersByStatus: string;
    topProducts: string;
    salesCount: string;
    loadingReport: string;
    errorLoading: string;
  };

  // Settings
  settingsPage: {
    title: string;
    subtitle: string;
    basicSettings: string;
    personalManagementSystem: string;
    userProfile: string;
    securitySection: string;
    actions: string;
    account: string;
    preferences: string;
    security: string;
    notifications: string;
    changeRole: string;
    currentRole: string;
    selectNewRole: string;
    switchRole: string;
    roleChanged: string;
    clearCache: string;
    clearCacheSubtitle: string;
    cacheCleared: string;
    cacheClearedSuccess: string;
    confirmClearCache: string;
    about: string;
    aboutSubtitle: string;
    aboutMessage: string;
    version: string;
    offlineData: string;
    offlineDataSubtitle: string;
    totalSize: string;
    lastSync: string;
    clearOfflineData: string;
    changePIN: string;
    changePINSubtitle: string;
    enterNewPIN: string;
    confirmPIN: string;
    lockApp: string;
    lockAppSubtitle: string;
    userManagement: string;
    userManagementSubtitle: string;
    logout: string;
    logoutSubtitle: string;
    confirmLogout: string;
    closeApp: string;
    closeAppSubtitle: string;
    requestAdminAccess: string;
    requestAdminAccessSubtitle: string;
  };

  profilePage: {
    title: string;
    subtitle: string;
    loading: string;
    errorLoading: string;
    unknownError: string;
    user: string;
    role: string;
    telegramId: string;
    memberSince: string;
    accountActions: string;
    settings: string;
    changeRole: string;
    logout: string;
    confirmLogout: string;
    editProfile: string;
    personalInfo: string;
    fullName: string;
    phoneNumber: string;
    address: string;
    bio: string;
    avatar: string;
    changeAvatar: string;
    updateProfile: string;
    profileUpdated: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };

  // Driver Dashboard
  driverDashboard: {
    title: string;
    activeDeliveries: string;
    completedToday: string;
    earnings: string;
    rating: string;
    availableOrders: string;
    myRoute: string;
    acceptOrder: string;
    startDelivery: string;
    completeDelivery: string;
    navigation: string;
    customerInfo: string;
    orderDetails: string;
    noActiveDeliveries: string;
  };

  // Dispatch Board
  dispatchBoard: {
    title: string;
    unassigned: string;
    assigned: string;
    inProgress: string;
    availableDrivers: string;
    assignDriver: string;
    reassign: string;
    viewRoute: string;
    optimizeRoute: string;
    driverLocation: string;
    estimatedTime: string;
    noOrders: string;
  };

  // Warehouse Dashboard
  warehouseDashboard: {
    title: string;
    receiving: string;
    picking: string;
    packing: string;
    shipping: string;
    pendingReceiving: string;
    pendingPicking: string;
    readyToShip: string;
    lowStock: string;
    restockNeeded: string;
  };

  myZonesPage: {
    title: string;
    subtitle: string;
    systemNotSupported: string;
    errorLoadingZones: string;
    loadingZones: string;
    youAreOnline: string;
    youAreOffline: string;
    activeZone: string;
    refresh: string;
    activeZoneLabel: string;
    leaveZone: string;
    joinZone: string;
    setAsActiveZone: string;
    noZonesAvailable: string;
    cannotUpdateZoneAssignment: string;
    joinedZoneSuccessfully: string;
    leftZone: string;
    errorUpdatingZoneAssignment: string;
    cannotUpdateActiveZone: string;
    zoneSetAsActive: string;
    errorUpdatingActiveZone: string;
    activeZoneUpdate: string;
  };

  zoneManagementPage: {
    title: string;
    subtitle: string;
    loading: string;
    errorLoadingZones: string;
    zoneManagement: string;
    assignDrivers: string;
    assignedDrivers: string;
    assignDriver: string;
    noDriversAssigned: string;
    remove: string;
    confirmRemoveDriver: string;
    assignDriverToZone: string;
    assign: string;
    cancel: string;
    allDriversAssigned: string;
    driverAssignedSuccessfully: string;
    errorAssigningDriver: string;
    driverRemovedSuccessfully: string;
    errorRemovingDriver: string;
    createZone: string;
    editZone: string;
    deleteZone: string;
    zoneDetails: string;
    boundaries: string;
    activeDrivers: string;
    coverage: string;
    capacity: string;
    utilization: string;
  };

  driversManagementPage: {
    title: string;
    loading: string;
    errorLoadingDrivers: string;
    driversOutOf: string;
    refresh: string;
    refreshing: string;
    filter: string;
    totalDrivers: string;
    online: string;
    inDelivery: string;
    averageRating: string;
    searchPlaceholder: string;
    all: string;
    offline: string;
    busy: string;
    available: string;
    onBreak: string;
    list: string;
    map: string;
    analytics: string;
    noDriversFound: string;
    tryChangingFilter: string;
  };

  // User Management
  userManagement: {
    title: string;
    allUsers: string;
    activeUsers: string;
    inviteUser: string;
    editUser: string;
    deleteUser: string;
    userName: string;
    email: string;
    role: string;
    status: string;
    active: string;
    inactive: string;
    lastLogin: string;
    permissions: string;
    assignRole: string;
    removeUser: string;
    confirmDelete: string;
  };

  // Channels
  channelsPage: {
    title: string;
    myChannels: string;
    allChannels: string;
    createChannel: string;
    joinChannel: string;
    leaveChannel: string;
    channelName: string;
    channelDescription: string;
    members: string;
    addMembers: string;
    channelSettings: string;
    privateChannel: string;
    publicChannel: string;
    noChannels: string;
  };

  // Chat
  chatPage: {
    title: string;
    conversations: string;
    newMessage: string;
    typeMessage: string;
    sendMessage: string;
    encrypted: string;
    online: string;
    offline: string;
    typing: string;
    attachFile: string;
    sendImage: string;
    noConversations: string;
    startChat: string;
  };

  // Zones
  zonesPage: {
    title: string;
    allZones: string;
    myZones: string;
    createZone: string;
    editZone: string;
    zoneName: string;
    coverage: string;
    assignedDrivers: string;
    activeOrders: string;
    zoneCapacity: string;
    viewMap: string;
    noZones: string;
  };

  // Analytics
  analyticsPage: {
    title: string;
    businessMetrics: string;
    userGrowth: string;
    orderTrends: string;
    revenueForecast: string;
    kpiDashboard: string;
    customReport: string;
    exportData: string;
    dateComparison: string;
    previousPeriod: string;
    growth: string;
  };

  // Notifications
  notificationsPage: {
    title: string;
    allNotifications: string;
    unread: string;
    markAsRead: string;
    markAllRead: string;
    clearAll: string;
    orderUpdates: string;
    systemAlerts: string;
    messages: string;
    noNotifications: string;
    preferences: string;
    enableNotifications: string;
  };

  // Incoming
  incomingPage: {
    title: string;
    subtitle: string;
    pendingReceiving: string;
    received: string;
    receiveShipment: string;
    shipmentId: string;
    expectedItems: string;
    receivedItems: string;
    inspectItems: string;
    confirmReceiving: string;
    reportIssue: string;
    noIncoming: string;
    all: string;
    restocks: string;
    transfers: string;
    restock: string;
    transfer: string;
    incoming: string;
    totalIncoming: string;
    noIncomingOfType: string;
    allIncomingWillAppear: string;
    unknownProduct: string;
    from: string;
    to: string;
    unknownLocation: string;
    units: string;
    id: string;
    inventoryLogUnavailable: string;
    errorLoadingIncoming: string;
  };

  // Restock Requests
  restockPage: {
    title: string;
    pendingRequests: string;
    approved: string;
    rejected: string;
    createRequest: string;
    productName: string;
    requestedQuantity: string;
    urgency: string;
    urgent: string;
    normal: string;
    low: string;
    approveRequest: string;
    rejectRequest: string;
    noRequests: string;
  };

  // Logs
  logsPage: {
    title: string;
    activityLog: string;
    systemLogs: string;
    userActions: string;
    timestamp: string;
    action: string;
    user: string;
    details: string;
    filterByUser: string;
    filterByAction: string;
    exportLogs: string;
    noLogs: string;
  };

  // My Stats
  myStatsPage: {
    title: string;
    performance: string;
    completedTasks: string;
    hoursWorked: string;
    efficiency: string;
    achievements: string;
    weeklyStats: string;
    monthlyStats: string;
    compareWithTeam: string;
  };

  // Businesses
  businessesPage: {
    title: string;
    myBusinesses: string;
    createBusiness: string;
    businessName: string;
    businessType: string;
    switchBusiness: string;
    manageBusiness: string;
    businessSettings: string;
    noBusinesses: string;
  };

  // My Deliveries
  myDeliveriesPage: {
    title: string;
    subtitle: string;
    deliveryId: string;
    customer: string;
    address: string;
    deliveryWindow: string;
    readyToGo: string;
    onTheWay: string;
    delivered: string;
    noDeliveries: string;
  };

  // Driver Dashboard Extended
  driverDashboardExtended: {
    toggleOnline: string;
    goOnline: string;
    goOffline: string;
    statusOnline: string;
    statusOffline: string;
    todayEarnings: string;
    weekEarnings: string;
    monthEarnings: string;
    lastLocationUpdate: string;
    updateLocation: string;
    thisPageForDriversOnly: string;
    errorLoadingData: string;
    statusChangeError: string;
    wentOnline: string;
    wentOffline: string;
    acceptingOrders: string;
    notAcceptingOrders: string;
    hello: string;
    readyForNextDelivery: string;
    refresh: string;
    onlineAvailable: string;
    offlineUnavailable: string;
    willReceiveNotifications: string;
    willNotReceiveOrders: string;
    lastLocationUpdateAt: string;
    close: string;
    open: string;
    earnings: string;
    earningsForPeriod: string;
    baseSalary: string;
    tips: string;
    bonuses: string;
    active: string;
    completedToday: string;
    rating: string;
    activeHours: string;
    activeOrders: string;
    noOrdersNow: string;
    youAreOffline: string;
    nextOrderWillAppear: string;
    goOnlineToReceiveOrders: string;
  };

  // Dispatch Board Extended
  dispatchBoardExtended: {
    autoAssign: string;
    manualAssign: string;
    orderQueue: string;
    driverMap: string;
    filters: string;
    priority: string;
    urgentOrders: string;
    standardOrders: string;
    bulkAssign: string;
  };

  // Zone Management
  zoneManagementPage: {
    createZone: string;
    editZone: string;
    deleteZone: string;
    zoneDetails: string;
    boundaries: string;
    activeDrivers: string;
    coverage: string;
    capacity: string;
    utilization: string;
    assignDrivers: string;
  };

  // Freelancer Driver
  freelancerDriverPage: {
    title: string;
    marketplace: string;
    availableOrders: string;
    myAcceptedOrders: string;
    earnings: string;
    rating: string;
    acceptOrder: string;
    viewDetails: string;
    noAvailableOrders: string;
  };

  // Infrastructure Owner Dashboard
  infrastructureDashboardPage: {
    title: string;
    overview: string;
    totalBusinesses: string;
    activeDrivers: string;
    warehouseCapacity: string;
    systemHealth: string;
    manageInfrastructure: string;
    viewMetrics: string;
  };

  // Example Dashboard
  exampleDashboardPage: {
    title: string;
    sampleData: string;
    demoMode: string;
    exampleMetrics: string;
    testFeatures: string;
  };

  // Dashboard Common
  dashboardCommon: {
    metrics: string;
    kpis: string;
    charts: string;
    recentActivity: string;
    quickActions: string;
    viewAll: string;
    last7Days: string;
    last30Days: string;
    thisMonth: string;
    thisWeek: string;
    today: string;
    total: string;
    active: string;
    pending: string;
    growth: string;
    change: string;
    vs: string;
    lastPeriod: string;
  };

  // Dispatch Board
  dispatchBoardPage: {
    title: string;
    subtitle: string;
    systemNotSupported: string;
    errorLoadingCoverage: string;
    realTime: string;
    list: string;
    kanban: string;
    refresh: string;
    availableDrivers: string;
    coverageZones: string;
    inDelivery: string;
    waiting: string;
    waitingForAssignment: string;
    assigned: string;
    inProgress: string;
    completed: string;
    noWaitingOrders: string;
    noAssignedOrders: string;
    noDeliveriesInProgress: string;
    noCompletedOrders: string;
    assignDriverToOrder: string;
    driver: string;
    available: string;
    noAvailableDrivers: string;
    driverAssignedSuccessfully: string;
    errorAssigningDriver: string;
    assignDriver: string;
    loadingDispatchBoard: string;
  };

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

  benefits: {
    title: string;
    subtitle: string;
    quality: { title: string; description: string };
    speed: { title: string; description: string };
    variety: { title: string; description: string };
    trust: { title: string; description: string };
  };

  howItWorks: {
    title: string;
    subtitle: string;
    step1: { title: string; description: string };
    step2: { title: string; description: string };
    step3: { title: string; description: string };
    step4: { title: string; description: string };
  };

  workWithUs: {
    title: string;
    description: string;
    button: string;
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
  channels: 'ערוצים',
  profile: 'פרופיל',
  notifications: 'התראות',
  chat: 'צ\'אט',
  zones: 'אזורים',
  users: 'משתמשים',

  // Bottom Navigation Actions
  platformActions: 'פעולות פלטפורמה',
  adminActions: 'פעולות מנהל',
  browse: 'עיון',
  shop: 'קניות',
  cart: 'עגלה',

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

  // Dashboard metrics
  dashboardMetrics: {
    totalBusinesses: 'סה"כ עסקים',
    activeBusinesses: 'עסקים פעילים',
    revenueToday: 'הכנסות היום',
    totalOrders: 'סה"כ הזמנות',
    activeDrivers: 'נהגים פעילים',
    pendingAllocations: 'הקצאות ממתינות',
    platformWide: 'בכל הפלטפורמה',
    acrossAllBusinesses: 'על פני כל העסקים',
    requiresApproval: 'דורש אישור',
    infrastructureBusiness: 'תשתית + עסקים',
  },

  // Action labels
  actions: {
    createNewBusiness: 'צור עסק חדש',
    viewAll: 'ראה הכל',
    viewAuditLog: 'ראה יומן ביקורת',
    goToBusinessesPage: 'עבור לעמוד עסקים',
  },

  // Dashboard sections
  dashboardSections: {
    businessOverview: 'סקירת עסקים',
    recentSystemActivity: 'פעילות מערכת אחרונה',
    platformControl: 'מרכז בקרת תשתית',
    globalPlatformManagement: 'פיקוח וניהול פלטפורמה גלובלית',
    noBusinessesYet: 'אין עסקים עדיין',
    createFirstBusiness: 'צור את העסק הראשון שלך כדי להתחיל',
    noRecentActivity: 'אין פעילות אחרונה',
    systemActivityWillAppear: 'פעילות המערכת תופיע כאן',
  },

  // System health status
  systemHealth: {
    healthy: 'תקין',
    warning: 'אזהרה',
    critical: 'קריטי',
  },

  // Business Dashboard
  businessDashboard: {
    title: 'לוח מחוונים עסקי',
    subtitle: 'סקירה פיננסית ומדדים תפעוליים',
    welcome: 'ברוכים הבאים בעל העסק!',
    selectBusinessMessage: 'כדי להתחיל, עליך לבחור עסק או ליצור עסק חדש. לחץ על הכפתור למטה כדי לעבור לעמוד הניהול של העסקים שלך.',
    exportReport: 'ייצא דוח',
    manageTeam: 'נהל צוות',
    ownershipDistribution: 'חלוקת בעלות',
    equityAndProfitSharing: 'הון עצמי וחלוקת רווחים',
    teamPerformance: 'ביצועי צוות',
    memberContributions: 'תרומות חברי הצוות ופעילות',
    recentOrders: 'הזמנות אחרונות',
    latestTransactions: 'עסקאות ומשלוחים אחרונים',
    noTeamMembers: 'אין חברי צוות',
    teamMembersWillAppear: 'חברי הצוות יופיעו כאן לאחר שיוזמנו למערכת',
    noOrdersYet: 'אין הזמנות עדיין',
    ordersWillAppear: 'הזמנות יופיעו כאן כשהן ייווצרו',
  },

  // Financial Metrics
  financialMetrics: {
    profitMonth: 'רווח (חודשי)',
    costsMonth: 'עלויות (חודשי)',
    revenueMonth: 'הכנסות (חודשי)',
    ordersMonth: 'הזמנות (חודשי)',
    margin: 'מרווח',
    operatingExpenses: 'הוצאות תפעוליות',
    today: 'היום',
    avg: 'ממוצע',
    ownership: 'בעלות',
    profitShare: 'חלק ברווח',
    estimatedMonthlyShare: 'חלק חודשי משוער',
    name: 'שם',
    role: 'תפקיד',
    ordersCompleted: 'הזמנות שהושלמו',
    revenueGenerated: 'הכנסות שנוצרו',
    status: 'סטטוס',
  },

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
    noPermission: 'אין לך הרשאה',
    failed: 'הפעולה נכשלה',
    unknownError: 'שגיאה לא ידועה',
  },

  // Success messages
  success: {
    saved: 'נשמר בהצלחה',
    created: 'נוצר בהצלחה',
    updated: 'עודכן בהצלחה',
    deleted: 'נמחק בהצלחה',
  },

  // Common phrases
  phrases: {
    loadingOrders: 'טוען הזמנות...',
    loadingData: 'טוען נתונים...',
    noData: 'אין נתונים',
    user: 'משתמש',
    actions: 'פעולות',
    menu: 'תפריט',
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

  // Admin Panel
  admin: {
    title: 'פאנל ניהול',
    overview: 'סקירה',
    users: 'משתמשים',
    bulk: 'פעולות מרובות',
    export: 'ייצוא',
    systemStats: 'סטטיסטיקות מערכת',
    totalOrders: 'סה"כ הזמנות',
    totalProducts: 'סה"כ מוצרים',
    totalTasks: 'סה"כ משימות',
    activeUsers: 'משתמשים פעילים',
    todayOrders: 'הזמנות היום',
    bulkOperations: 'פעולות מרובות',
    bulkUpdateStatus: 'עדכון סטטוס מרובה',
    bulkAssignTasks: 'הקצאת משימות מרובה',
    bulkUpdatePrices: 'עדכון מחירים מרובה',
    markAllRead: 'סמן הכל כנקרא',
    exportOrders: 'ייצא הזמנות',
    exportProducts: 'ייצא מוצרים',
    dateRange: 'טווח תאריכים',
    from: 'מ-',
    to: 'עד-',
  },

  // Products
  productsPage: {
    title: 'מוצרים',
    allProducts: 'כל המוצרים',
    category: 'קטגוריה',
    searchProducts: 'חפש מוצרים',
    createProduct: 'צור מוצר',
    editProduct: 'ערוך מוצר',
    productName: 'שם המוצר',
    description: 'תיאור',
    price: 'מחיר',
    stock: 'מלאי',
    sku: 'מק"ט',
    inStock: 'במלאי',
    lowStock: 'מלאי נמוך',
    outOfStock: 'אזל מהמלאי',
    noProducts: 'אין מוצרים',
  },

  // Tasks
  tasksPage: {
    title: 'משימות',
    myTasks: 'המשימות שלי',
    allTasks: 'כל המשימות',
    createTask: 'צור משימה',
    editTask: 'ערוך משימה',
    taskTitle: 'כותרת המשימה',
    taskDescription: 'תיאור המשימה',
    assignedTo: 'הוקצה ל',
    dueDate: 'תאריך יעד',
    priority: 'עדיפות',
    high: 'גבוהה',
    medium: 'בינונית',
    low: 'נמוכה',
    status: 'סטטוס',
    inProgress: 'בתהליך',
    noTasks: 'אין משימות',
  },

  // Inventory
  inventoryPage: {
    title: 'מלאי',
    aggregated: 'מצטבר',
    byLocation: 'לפי מיקום',
    onHand: 'זמין',
    reserved: 'שמור',
    damaged: 'פגום',
    adjustInventory: 'התאם מלאי',
    quantity: 'כמות',
    reason: 'סיבה',
    location: 'מיקום',
    alerts: 'התראות',
    noAlerts: 'אין התראות',
  },

  // My Inventory
  myInventoryPage: {
    title: 'המלאי שלי',
    subtitle: 'סקירה ועריכה של המוצרים שברשותך. עדכן כמויות וסנכרן את השינויים למוקד',
    totalUnits: 'סה״כ יחידות בטיוטה',
    saveChanges: 'שמור שינויים',
    syncing: 'מסנכרן…',
    loadingInventory: 'טוען מלאי אישי…',
    remove: 'הסר',
    quantityInVehicle: 'כמות ברכב',
    noItemsAssigned: 'אין פריטים שהוקצו לך כרגע',
    addNewProduct: 'הוסף מוצר חדש',
    selectProduct: 'בחר מוצר מהרשימה',
    add: 'הוסף',
    errorLoadingInventory: 'שגיאה בטעינת המלאי האישי',
    selectProductToAdd: 'בחר מוצר להוספה',
    productNotFound: 'המוצר לא נמצא',
    cannotSyncInventory: 'לא ניתן לסנכרן מלאי במערכת הנוכחית',
    inventoryUpdated: 'המלאי עודכן',
    updatedAndRemoved: 'עודכנו, הוסרו',
    errorUpdatingInventory: 'שגיאה בעדכון המלאי',
    driverInventoryUpdate: 'עדכון מלאי נהג באפליקציה',
  },

  // Driver Status
  driverStatusPage: {
    title: 'סטטוס נהג',
    available: 'זמין לקבלת משלוחים',
    delivering: 'במשלוח פעיל',
    onBreak: 'בהפסקה',
    offShift: 'סיים משמרת',
    notAvailable: 'לא זמין',
    statusUnavailable: 'המערכת אינה תומכת במעקב סטטוס נהגים',
    errorLoadingStatus: 'שגיאה בטעינת נתוני הסטטוס',
    cannotUpdateStatus: 'לא ניתן לעדכן סטטוס נהג במערכת הנוכחית',
    driverLoggedOut: 'נהג התנתק',
  },

  // Manager Inventory
  managerInventoryPage: {
    title: 'בקרת מלאי למנהלים',
    subtitle: 'סקירה מהירה של מלאי חסר, בקשות חידוש ממתינות ותנועות בולטות',
    lowStockProducts: 'מוצרים בחוסר',
    pendingApproval: 'בקשות לאישור',
    approvedPending: 'מאושרות ממתינות',
    alerts: 'התראות',
    loadingData: 'טוען נתונים...',
    noData: 'אין נתונים להצגה',
    available: 'זמין',
    allocated: 'בהקצאה',
    activeLocations: 'מיקומים פעילים',
    alertThreshold: 'סף התראה',
  },

  // Reports
  reportsPage: {
    title: 'דוחות',
    overview: 'סקירה',
    sales: 'מכירות',
    revenue: 'הכנסות',
    orders: 'הזמנות',
    performance: 'ביצועים',
    dateRange: 'טווח תאריכים',
    day: 'יום',
    week: 'שבוע',
    month: 'חודש',
    year: 'שנה',
    totalRevenue: 'סה"כ הכנסות',
    averageOrder: 'ממוצע הזמנה',
    revenueByDay: 'הכנסות לפי יום',
    ordersByStatus: 'הזמנות לפי סטטוס',
    topProducts: 'מוצרים מובילים',
    salesCount: 'מספר מכירות',
    loadingReport: 'טוען דוח...',
    errorLoading: 'שגיאה בטעינת דוח',
  },

  // Settings
  settingsPage: {
    title: 'הגדרות',
    subtitle: 'מערכת ניהול אישית',
    basicSettings: 'הגדרות בסיסיות',
    personalManagementSystem: 'מערכת ניהול אישית',
    userProfile: 'פרופיל משתמש',
    securitySection: 'אבטחה',
    actions: 'פעולות',
    account: 'חשבון',
    preferences: 'העדפות',
    security: 'אבטחה',
    notifications: 'התראות',
    changeRole: 'שנה תפקיד',
    currentRole: 'תפקיד נוכחי',
    selectNewRole: 'בחר תפקיד חדש',
    switchRole: 'החלף תפקיד',
    roleChanged: 'התפקיד הוחלף בהצלחה',
    clearCache: 'נקה מטמון',
    clearCacheSubtitle: 'מחק נתונים מקומיים',
    cacheCleared: 'המטמון נוקה',
    cacheClearedSuccess: 'המטמון נוקה בהצלחה',
    confirmClearCache: 'למחוק את כל הנתונים השמורים?',
    about: 'אודות',
    aboutSubtitle: 'מידע על האפליקציה',
    aboutMessage: 'מערכת ניהול לוגיסטיקה מלכותית\n\nנבנה עם React ו-Telegram WebApp SDK',
    version: 'גרסה',
    offlineData: 'נתונים לא מקוונים',
    offlineDataSubtitle: 'בדוק בקשות מושהות ונקה אותן',
    totalSize: 'גודל כולל',
    lastSync: 'סנכרון אחרון',
    clearOfflineData: 'נקה נתונים לא מקוונים',
    changePIN: 'שינוי קוד אבטחה',
    changePINSubtitle: 'עדכון הקוד הסודי שלך (PIN)',
    enterNewPIN: 'הזן PIN חדש',
    confirmPIN: 'אשר PIN',
    lockApp: 'נעילת האפליקציה',
    lockAppSubtitle: 'נעל את האפליקציה וחזור למסך קוד אבטחה',
    userManagement: 'ניהול משתמשים',
    userManagementSubtitle: 'אישור וניהול משתמשים במערכת',
    logout: 'התנתק',
    logoutSubtitle: 'נקה הפעלה וחזור למסך התחברות',
    confirmLogout: 'האם אתה בטוח שברצונך להתנתק?',
    closeApp: 'סגור אפליקציה',
    closeAppSubtitle: 'חזור לטלגרם',
    requestAdminAccess: 'בקש גישת מנהל',
    requestAdminAccessSubtitle: 'הזן PIN למעבר לתפקיד מנהל',
  },

  // Driver Dashboard
  driverDashboard: {
    title: 'לוח בקרה נהג',
    activeDeliveries: 'משלוחים פעילים',
    completedToday: 'הושלמו היום',
    earnings: 'רווחים',
    rating: 'דירוג',
    availableOrders: 'הזמנות זמינות',
    myRoute: 'המסלול שלי',
    acceptOrder: 'קבל הזמנה',
    startDelivery: 'התחל משלוח',
    completeDelivery: 'השלם משלוח',
    navigation: 'ניווט',
    customerInfo: 'פרטי לקוח',
    orderDetails: 'פרטי הזמנה',
    noActiveDeliveries: 'אין משלוחים פעילים',
  },

  // Dispatch Board
  dispatchBoard: {
    title: 'מוקד תפעול',
    unassigned: 'לא מוקצה',
    assigned: 'מוקצה',
    inProgress: 'בתהליך',
    availableDrivers: 'נהגים זמינים',
    assignDriver: 'הקצה נהג',
    reassign: 'הקצה מחדש',
    viewRoute: 'צפה במסלול',
    optimizeRoute: 'אופטימיזציה',
    driverLocation: 'מיקום נהג',
    estimatedTime: 'זמן משוער',
    noOrders: 'אין הזמנות',
  },

  // Warehouse Dashboard
  warehouseDashboard: {
    title: 'לוח בקרה מחסן',
    receiving: 'קבלה',
    picking: 'איסוף',
    packing: 'אריזה',
    shipping: 'משלוח',
    pendingReceiving: 'ממתין לקבלה',
    pendingPicking: 'ממתין לאיסוף',
    readyToShip: 'מוכן למשלוח',
    lowStock: 'מלאי נמוך',
    restockNeeded: 'נדרש חידוש מלאי',
  },

  myZonesPage: {
    title: 'האזורים שלי',
    subtitle: 'נהל את אזורי הפעילות שלך, הצטרף לאזורים חדשים וקבע את האזור הפעיל למעקב בזמן אמת',
    systemNotSupported: 'המערכת אינה תומכת במעקב אזורים עבור נהגים',
    errorLoadingZones: 'שגיאה בטעינת נתוני האזורים',
    loadingZones: 'טוען נתוני אזורים…',
    youAreOnline: '🟢 אתה מחובר למערכת',
    youAreOffline: '⚪ אתה במצב לא מקוון',
    activeZone: 'אזור פעיל',
    refresh: 'רענן',
    activeZoneLabel: 'אזור פעיל',
    leaveZone: 'עזוב אזור',
    joinZone: 'הצטרף לאזור',
    setAsActiveZone: 'קבע כאזור פעיל',
    noZonesAvailable: 'אין אזורים זמינים כעת. פנה למנהל לקבלת שיוך',
    cannotUpdateZoneAssignment: 'לא ניתן לעדכן שיוך אזור במערכת הנוכחית',
    joinedZoneSuccessfully: 'הצטרפת לאזור בהצלחה',
    leftZone: 'נותקת מהאזור',
    errorUpdatingZoneAssignment: 'שגיאה בעדכון שיוך האזור',
    cannotUpdateActiveZone: 'לא ניתן לעדכן אזור פעיל במערכת הנוכחית',
    zoneSetAsActive: 'האזור נקבע כאזור הפעיל שלך',
    errorUpdatingActiveZone: 'שגיאה בעדכון אזור הפעילות',
    activeZoneUpdate: 'עדכון אזור פעיל',
  },

  zoneManagementPage: {
    title: 'ניהול אזורים',
    subtitle: 'שיוך נהגים לאזורי פעילות',
    loading: 'טוען...',
    errorLoadingZones: 'שגיאה בטעינת אזורים',
    zoneManagement: 'ניהול אזורים',
    assignDrivers: 'שיוך נהגים',
    assignedDrivers: 'נהגים משוייכים',
    assignDriver: '+ שייך נהג',
    noDriversAssigned: 'אין נהגים משוייכים לאזור זה',
    remove: 'הסר',
    confirmRemoveDriver: 'האם להסיר נהג זה מהאזור?',
    assignDriverToZone: 'שיוך נהג ל',
    assign: 'שייך',
    cancel: 'ביטול',
    allDriversAssigned: 'כל הנהגים כבר משוייכים לאזור זה',
    driverAssignedSuccessfully: 'נהג שוייך לאזור בהצלחה',
    errorAssigningDriver: 'שגיאה בשיוך נהג',
    driverRemovedSuccessfully: 'נהג הוסר מהאזור',
    errorRemovingDriver: 'שגיאה בהסרת נהג',
    createZone: 'צור אזור',
    editZone: 'ערוך אזור',
    deleteZone: 'מחק אזור',
    zoneDetails: 'פרטי אזור',
    boundaries: 'גבולות',
    activeDrivers: 'נהגים פעילים',
    coverage: 'כיסוי',
    capacity: 'קיבולת',
    utilization: 'ניצולת',
  },

  driversManagementPage: {
    title: 'ניהול נהגים',
    loading: 'טוען נהגים...',
    errorLoadingDrivers: 'שגיאה בטעינת נהגים',
    driversOutOf: 'נהגים מתוך',
    refresh: 'רענן',
    refreshing: '⟳',
    filter: 'סינון',
    totalDrivers: 'סך נהגים',
    online: 'מקוונים',
    inDelivery: 'במשלוח',
    averageRating: 'דירוג ממוצע',
    searchPlaceholder: 'חפש לפי שם, טלפון או רכב...',
    all: 'הכל',
    offline: 'לא מקוון',
    busy: 'עסוק',
    available: 'זמין',
    onBreak: 'בהפסקה',
    list: 'רשימה',
    map: 'מפה',
    analytics: 'ניתוח',
    noDriversFound: 'לא נמצאו נהגים',
    tryChangingFilter: 'נסה לשנות את הסינון או החיפוש',
  },

  // User Management
  userManagement: {
    title: 'ניהול משתמשים',
    allUsers: 'כל המשתמשים',
    activeUsers: 'משתמשים פעילים',
    inviteUser: 'הזמן משתמש',
    editUser: 'ערוך משתמש',
    deleteUser: 'מחק משתמש',
    userName: 'שם משתמש',
    email: 'אימייל',
    role: 'תפקיד',
    status: 'סטטוס',
    active: 'פעיל',
    inactive: 'לא פעיל',
    lastLogin: 'התחברות אחרונה',
    permissions: 'הרשאות',
    assignRole: 'הקצה תפקיד',
    removeUser: 'הסר משתמש',
    confirmDelete: 'אשר מחיקה',
  },

  // Channels
  channelsPage: {
    title: 'ערוצים',
    myChannels: 'הערוצים שלי',
    allChannels: 'כל הערוצים',
    createChannel: 'צור ערוץ',
    joinChannel: 'הצטרף לערוץ',
    leaveChannel: 'עזוב ערוץ',
    channelName: 'שם הערוץ',
    channelDescription: 'תיאור הערוץ',
    members: 'חברים',
    addMembers: 'הוסף חברים',
    channelSettings: 'הגדרות ערוץ',
    privateChannel: 'ערוץ פרטי',
    publicChannel: 'ערוץ ציבורי',
    noChannels: 'אין ערוצים',
  },

  // Chat
  chatPage: {
    title: 'צ\'אט',
    conversations: 'שיחות',
    newMessage: 'הודעה חדשה',
    typeMessage: 'הקלד הודעה',
    sendMessage: 'שלח הודעה',
    encrypted: 'מוצפן',
    online: 'מחובר',
    offline: 'לא מחובר',
    typing: 'מקליד...',
    attachFile: 'צרף קובץ',
    sendImage: 'שלח תמונה',
    noConversations: 'אין שיחות',
    startChat: 'התחל שיחה',
  },

  // Zones
  zonesPage: {
    title: 'אזורים',
    allZones: 'כל האזורים',
    myZones: 'האזורים שלי',
    createZone: 'צור אזור',
    editZone: 'ערוך אזור',
    zoneName: 'שם האזור',
    coverage: 'כיסוי',
    assignedDrivers: 'נהגים משוייכים',
    activeOrders: 'הזמנות פעילות',
    zoneCapacity: 'קיבולת אזור',
    viewMap: 'צפה במפה',
    noZones: 'אין אזורים',
  },

  // Analytics
  analyticsPage: {
    title: 'אנליטיקה',
    businessMetrics: 'מדדי עסק',
    userGrowth: 'גידול משתמשים',
    orderTrends: 'מגמות הזמנות',
    revenueForecast: 'תחזית הכנסות',
    kpiDashboard: 'לוח מחוונים',
    customReport: 'דוח מותאם',
    exportData: 'ייצא נתונים',
    dateComparison: 'השוואת תקופות',
    previousPeriod: 'תקופה קודמת',
    growth: 'גידול',
  },

  // Profile
  profilePage: {
    title: 'הפרופיל שלי',
    subtitle: 'מידע אישי והגדרות חשבון',
    loading: 'טוען פרופיל...',
    errorLoading: 'שגיאה בטעינת פרופיל',
    unknownError: 'שגיאה לא ידועה',
    user: 'משתמש',
    role: 'תפקיד',
    telegramId: 'מזהה טלגרם',
    memberSince: 'חבר מאז',
    accountActions: 'פעולות חשבון',
    settings: 'הגדרות',
    changeRole: 'שנה תפקיד',
    logout: 'התנתק',
    confirmLogout: 'האם אתה בטוח שברצונך להתנתק?',
    editProfile: 'ערוך פרופיל',
    personalInfo: 'מידע אישי',
    fullName: 'שם מלא',
    phoneNumber: 'מספר טלפון',
    address: 'כתובת',
    bio: 'ביוגרפיה',
    avatar: 'תמונת פרופיל',
    changeAvatar: 'שנה תמונה',
    updateProfile: 'עדכן פרופיל',
    profileUpdated: 'הפרופיל עודכן',
    changePassword: 'שנה סיסמה',
    currentPassword: 'סיסמה נוכחית',
    newPassword: 'סיסמה חדשה',
    confirmPassword: 'אשר סיסמה',
  },

  // Notifications
  notificationsPage: {
    title: 'התראות',
    allNotifications: 'כל ההתראות',
    unread: 'לא נקראו',
    markAsRead: 'סמן כנקרא',
    markAllRead: 'סמן הכל כנקרא',
    clearAll: 'נקה הכל',
    orderUpdates: 'עדכוני הזמנות',
    systemAlerts: 'התראות מערכת',
    messages: 'הודעות',
    noNotifications: 'אין התראות',
    preferences: 'העדפות',
    enableNotifications: 'אפשר התראות',
  },

  // Incoming
  incomingPage: {
    title: 'כניסות',
    subtitle: 'מעקב אחר כניסות למחסן והעברות מלאי',
    pendingReceiving: 'ממתין לקבלה',
    received: 'התקבל',
    receiveShipment: 'קבל משלוח',
    shipmentId: 'מזהה משלוח',
    expectedItems: 'פריטים צפויים',
    receivedItems: 'פריטים שהתקבלו',
    inspectItems: 'בדוק פריטים',
    confirmReceiving: 'אשר קבלה',
    reportIssue: 'דווח על בעיה',
    noIncoming: 'אין משלוחים נכנסים',
    all: 'הכל',
    restocks: 'חידושי מלאי',
    transfers: 'העברות',
    restock: 'חידוש מלאי',
    transfer: 'העברה',
    incoming: 'כניסה',
    totalIncoming: 'סה״כ כניסות',
    noIncomingOfType: 'אין כניסות מסוג זה',
    allIncomingWillAppear: 'כל הכניסות והעברות למחסן יופיעו כאן',
    unknownProduct: 'מוצר לא ידוע',
    from: 'מ',
    to: 'ל',
    unknownLocation: 'מיקום לא ידוע',
    units: 'יח׳',
    id: 'מזהה',
    inventoryLogUnavailable: 'רשימת יומני מלאי אינה זמינה',
    errorLoadingIncoming: 'שגיאה בטעינת יומני כניסות',
  },

  // Restock Requests
  restockPage: {
    title: 'בקשות חידוש מלאי',
    pendingRequests: 'בקשות ממתינות',
    approved: 'מאושר',
    rejected: 'נדחה',
    createRequest: 'צור בקשה',
    productName: 'שם מוצר',
    requestedQuantity: 'כמות מבוקשת',
    urgency: 'דחיפות',
    urgent: 'דחוף',
    normal: 'רגיל',
    low: 'נמוכה',
    approveRequest: 'אשר בקשה',
    rejectRequest: 'דחה בקשה',
    noRequests: 'אין בקשות',
  },

  // Logs
  logsPage: {
    title: 'יומן פעילות',
    activityLog: 'יומן פעילות',
    systemLogs: 'לוגים מערכת',
    userActions: 'פעולות משתמשים',
    timestamp: 'חותמת זמן',
    action: 'פעולה',
    user: 'משתמש',
    details: 'פרטים',
    filterByUser: 'סנן לפי משתמש',
    filterByAction: 'סנן לפי פעולה',
    exportLogs: 'ייצא לוגים',
    noLogs: 'אין לוגים',
  },

  // My Stats
  myStatsPage: {
    title: 'הסטטיסטיקות שלי',
    performance: 'ביצועים',
    completedTasks: 'משימות שהושלמו',
    hoursWorked: 'שעות עבודה',
    efficiency: 'יעילות',
    achievements: 'הישגים',
    weeklyStats: 'סטטיסטיקות שבועיות',
    monthlyStats: 'סטטיסטיקות חודשיות',
    compareWithTeam: 'השווה עם הצוות',
  },

  // Businesses
  businessesPage: {
    title: 'עסקים',
    myBusinesses: 'העסקים שלי',
    createBusiness: 'צור עסק',
    businessName: 'שם העסק',
    businessType: 'סוג העסק',
    switchBusiness: 'החלף עסק',
    manageBusiness: 'נהל עסק',
    businessSettings: 'הגדרות עסק',
    noBusinesses: 'אין עסקים',
  },

  // My Deliveries
  myDeliveriesPage: {
    title: 'המשלוחים שלי',
    subtitle: 'המסלול היומי שלך עם סטטוס עדכני ומידע על הלקוחות',
    deliveryId: 'מזהה משלוח',
    customer: 'לקוח',
    address: 'כתובת',
    deliveryWindow: 'חלון אספקה',
    readyToGo: 'מוכן ליציאה',
    onTheWay: 'בדרך',
    delivered: 'סופק',
    noDeliveries: 'אין משלוחים',
  },

  // Driver Dashboard Extended
  driverDashboardExtended: {
    toggleOnline: 'שנה סטטוס',
    goOnline: 'עבור למצב מקוון',
    goOffline: 'עבור למצב לא מקוון',
    statusOnline: 'מקוון',
    statusOffline: 'לא מקוון',
    todayEarnings: 'רווחים היום',
    weekEarnings: 'רווחים השבוע',
    monthEarnings: 'רווחים החודש',
    lastLocationUpdate: 'עדכון מיקום אחרון',
    updateLocation: 'עדכן מיקום',
    thisPageForDriversOnly: 'דף זה זמין לנהגים בלבד',
    errorLoadingData: 'שגיאה בטעינת נתונים',
    statusChangeError: 'שגיאה בשינוי סטטוס',
    wentOnline: 'עברת למצב מקוון',
    wentOffline: 'עברת למצב לא מקוון',
    acceptingOrders: 'מקבל הזמנות',
    notAcceptingOrders: 'לא מקבל הזמנות',
    hello: 'שלום',
    readyForNextDelivery: 'מוכן למשלוח הבא?',
    refresh: 'רענן',
    onlineAvailable: 'מקוון - זמין להזמנות',
    offlineUnavailable: 'לא מקוון',
    willReceiveNotifications: 'תקבל התראות על הזמנות חדשות',
    willNotReceiveOrders: 'לא תקבל הזמנות חדשות',
    lastLocationUpdateAt: 'עדכון מיקום אחרון',
    close: 'סגור',
    open: 'פתוח',
    earnings: 'הכנסות',
    earningsForPeriod: 'הכנסות',
    baseSalary: 'משכורת בסיס',
    tips: 'טיפים',
    bonuses: 'בונוסים',
    active: 'פעילות',
    completedToday: 'הושלמו היום',
    rating: 'דירוג',
    activeHours: 'שעות פעילות',
    activeOrders: 'הזמנות פעילות',
    noOrdersNow: 'אין הזמנות כרגע',
    youAreOffline: 'אתה לא מקוון',
    nextOrderWillAppear: 'ההזמנה הבאה תופיע כאן בקרוב',
    goOnlineToReceiveOrders: 'עבור למצב מקוון כדי לקבל הזמנות',
  },

  // Dispatch Board Extended
  dispatchBoardExtended: {
    autoAssign: 'הקצאה אוטומטית',
    manualAssign: 'הקצאה ידנית',
    orderQueue: 'תור הזמנות',
    driverMap: 'מפת נהגים',
    filters: 'סינונים',
    priority: 'עדיפות',
    urgentOrders: 'הזמנות דחופות',
    standardOrders: 'הזמנות רגילות',
    bulkAssign: 'הקצאה מרובה',
  },

  // Freelancer Driver
  freelancerDriverPage: {
    title: 'נהג עצמאי',
    marketplace: 'שוק הזמנות',
    availableOrders: 'הזמנות זמינות',
    myAcceptedOrders: 'ההזמנות שלי',
    earnings: 'רווחים',
    rating: 'דירוג',
    acceptOrder: 'קבל הזמנה',
    viewDetails: 'צפה בפרטים',
    noAvailableOrders: 'אין הזמנות זמינות',
  },

  // Infrastructure Owner Dashboard
  infrastructureDashboardPage: {
    title: 'לוח בקרה תשתית',
    overview: 'סקירה כללית',
    totalBusinesses: 'סה״כ עסקים',
    activeDrivers: 'נהגים פעילים',
    warehouseCapacity: 'קיבולת מחסן',
    systemHealth: 'תקינות מערכת',
    manageInfrastructure: 'נהל תשתית',
    viewMetrics: 'צפה במדדים',
  },

  // Example Dashboard
  exampleDashboardPage: {
    title: 'לוח בקרה לדוגמה',
    sampleData: 'נתונים לדוגמה',
    demoMode: 'מצב הדגמה',
    exampleMetrics: 'מדדים לדוגמה',
    testFeatures: 'בדיקת תכונות',
  },

  // Dashboard Common
  dashboardCommon: {
    metrics: 'מדדים',
    kpis: 'מדדי ביצוע',
    charts: 'גרפים',
    recentActivity: 'פעילות אחרונה',
    quickActions: 'פעולות מהירות',
    viewAll: 'צפה בהכל',
    last7Days: '7 ימים אחרונים',
    last30Days: '30 ימים אחרונים',
    thisMonth: 'החודש',
    thisWeek: 'השבוע',
    today: 'היום',
    total: 'סה״כ',
    active: 'פעיל',
    pending: 'ממתין',
    growth: 'גידול',
    change: 'שינוי',
    vs: 'לעומת',
    lastPeriod: 'תקופה קודמת',
  },

  dispatchBoardPage: {
    title: 'לוח שיגור',
    subtitle: 'ניהול משלוחים בזמן אמת',
    systemNotSupported: 'המערכת אינה נתמכת',
    errorLoadingCoverage: 'שגיאה בטעינת כיסוי השירות',
    realTime: 'זמן אמת',
    list: 'רשימה',
    kanban: 'קאנבאן',
    refresh: 'רענן',
    availableDrivers: 'נהגים זמינים',
    coverageZones: 'אזורי כיסוי',
    inDelivery: 'במשלוח',
    waiting: 'ממתין',
    waitingForAssignment: 'ממתין להקצאה',
    assigned: 'הוקצה',
    inProgress: 'בביצוע',
    completed: 'הושלם',
    noWaitingOrders: 'אין הזמנות ממתינות',
    noAssignedOrders: 'אין הזמנות מוקצות',
    noDeliveriesInProgress: 'אין משלוחים בביצוע',
    noCompletedOrders: 'אין הזמנות שהושלמו',
    assignDriverToOrder: 'הקצה נהג להזמנה',
    driver: 'נהג',
    available: 'זמין',
    noAvailableDrivers: 'אין נהגים זמינים',
    driverAssignedSuccessfully: 'הנהג הוקצה בהצלחה',
    errorAssigningDriver: 'שגיאה בהקצאת נהג',
    assignDriver: 'הקצה נהג',
    loadingDispatchBoard: 'טוען לוח שיגור...',
  },

  // Landing page translations - will be added below
  landing: {} as LandingTranslations,
};

const hebrewLanding: LandingTranslations = {
  title: 'UndergroundLab - שוק מקומי חכם',
  subtitle: 'קנו מהעסקים המובילים באזור שלכם',
  description: 'מוצרים איכותיים, משלוח מהיר ועד הבית - הכל במקום אחד',
  getStarted: 'התחילו לקנות',
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

  benefits: {
    title: 'למה לקנות אצלנו?',
    subtitle: 'חוויית קנייה מושלמת מהבית',
    quality: {
      title: 'איכות מובטחת',
      description: 'מוצרים מובחרים מעסקים מובילים באזור'
    },
    speed: {
      title: 'משלוח מהיר',
      description: 'קבלו את ההזמנה שלכם באותו יום'
    },
    variety: {
      title: 'מגוון עצום',
      description: 'מאות מוצרים וחנויות במקום אחד'
    },
    trust: {
      title: 'אמינות ושקיפות',
      description: 'מעקב בזמן אמת וביטחון מלא'
    }
  },

  howItWorks: {
    title: 'איך זה עובד?',
    subtitle: 'קניה פשוטה ומהירה ב-4 צעדים',
    step1: {
      title: 'עיינו בקטלוג',
      description: 'גלו מגוון מוצרים מעסקים שונים'
    },
    step2: {
      title: 'הוסיפו לסל',
      description: 'בחרו את המוצרים האהובים עליכם'
    },
    step3: {
      title: 'בצעו הזמנה',
      description: 'אישרו את הזמנתכם בקלות'
    },
    step4: {
      title: 'קבלו במהירות',
      description: 'נמסר אליכם עד הבית באותו יום'
    }
  },

  workWithUs: {
    title: 'רוצים להרוויח אתנו?',
    description: 'הצטרפו כעסק, נהג או חלק מהצוות שלנו',
    button: 'עבדו אתנו'
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
    title: 'מוכנים להזמין?',
    description: 'התחילו לקנות מהעסקים המובילים באזור שלכם',
    button: 'התחילו לקנות',
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
  channels: 'Channels',
  profile: 'Profile',
  notifications: 'Notifications',
  chat: 'Chat',
  zones: 'Zones',
  users: 'Users',

  // Bottom Navigation Actions
  platformActions: 'Platform Actions',
  adminActions: 'Admin Actions',
  browse: 'Browse',
  shop: 'Shop',
  cart: 'Cart',

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

  // Dashboard metrics
  dashboardMetrics: {
    totalBusinesses: 'Total Businesses',
    activeBusinesses: 'Active Businesses',
    revenueToday: 'Revenue Today',
    totalOrders: 'Total Orders',
    activeDrivers: 'Active Drivers',
    pendingAllocations: 'Pending Allocations',
    platformWide: 'Platform-wide',
    acrossAllBusinesses: 'Across all businesses',
    requiresApproval: 'Requires approval',
    infrastructureBusiness: 'Infrastructure + Businesses',
  },

  // Action labels
  actions: {
    createNewBusiness: 'Create New Business',
    viewAll: 'View All',
    viewAuditLog: 'View Audit Log',
    goToBusinessesPage: 'Go to Businesses Page',
  },

  // Dashboard sections
  dashboardSections: {
    businessOverview: 'Business Overview',
    recentSystemActivity: 'Recent System Activity',
    platformControl: 'Infrastructure Control Center',
    globalPlatformManagement: 'Global platform management and oversight',
    noBusinessesYet: 'No businesses yet',
    createFirstBusiness: 'Create your first business to get started',
    noRecentActivity: 'No recent activity',
    systemActivityWillAppear: 'System activity will appear here',
  },

  // System health status
  systemHealth: {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  },

  // Business Dashboard
  businessDashboard: {
    title: 'Business Dashboard',
    subtitle: 'Financial overview and operational metrics',
    welcome: 'Welcome Business Owner!',
    selectBusinessMessage: 'To get started, you need to select a business or create a new one. Click the button below to go to your business management page.',
    exportReport: 'Export Report',
    manageTeam: 'Manage Team',
    ownershipDistribution: 'Ownership Distribution',
    equityAndProfitSharing: 'Equity and profit sharing breakdown',
    teamPerformance: 'Team Performance',
    memberContributions: 'Member contributions and activity',
    recentOrders: 'Recent Orders',
    latestTransactions: 'Latest transactions and deliveries',
    noTeamMembers: 'No team members',
    teamMembersWillAppear: 'Team members will appear here after they are invited to the system',
    noOrdersYet: 'No orders yet',
    ordersWillAppear: 'Orders will appear here as they are created',
  },

  // Financial Metrics
  financialMetrics: {
    profitMonth: 'Profit (Month)',
    costsMonth: 'Costs (Month)',
    revenueMonth: 'Revenue (Month)',
    ordersMonth: 'Orders (Month)',
    margin: 'margin',
    operatingExpenses: 'Operating expenses',
    today: 'today',
    avg: 'avg',
    ownership: 'ownership',
    profitShare: 'Profit Share',
    estimatedMonthlyShare: 'Est. Monthly Share',
    name: 'Name',
    role: 'Role',
    ordersCompleted: 'Orders',
    revenueGenerated: 'Revenue Generated',
    status: 'Status',
  },

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
    noPermission: 'You do not have permission',
    failed: 'Operation failed',
    unknownError: 'Unknown error',
  },

  // Success messages
  success: {
    saved: 'Saved successfully',
    created: 'Created successfully',
    updated: 'Updated successfully',
    deleted: 'Deleted successfully',
  },

  // Common phrases
  phrases: {
    loadingOrders: 'Loading orders...',
    loadingData: 'Loading data...',
    noData: 'No data',
    user: 'User',
    actions: 'Actions',
    menu: 'Menu',
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

  // Admin Panel
  admin: {
    title: 'Admin Panel',
    overview: 'Overview',
    users: 'Users',
    bulk: 'Bulk Operations',
    export: 'Export',
    systemStats: 'System Statistics',
    totalOrders: 'Total Orders',
    totalProducts: 'Total Products',
    totalTasks: 'Total Tasks',
    activeUsers: 'Active Users',
    todayOrders: 'Today Orders',
    bulkOperations: 'Bulk Operations',
    bulkUpdateStatus: 'Bulk Update Status',
    bulkAssignTasks: 'Bulk Assign Tasks',
    bulkUpdatePrices: 'Bulk Update Prices',
    markAllRead: 'Mark All Read',
    exportOrders: 'Export Orders',
    exportProducts: 'Export Products',
    dateRange: 'Date Range',
    from: 'From',
    to: 'To',
  },

  // Products
  productsPage: {
    title: 'Products',
    allProducts: 'All Products',
    category: 'Category',
    searchProducts: 'Search Products',
    createProduct: 'Create Product',
    editProduct: 'Edit Product',
    productName: 'Product Name',
    description: 'Description',
    price: 'Price',
    stock: 'Stock',
    sku: 'SKU',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    noProducts: 'No Products',
  },

  // Tasks
  tasksPage: {
    title: 'Tasks',
    myTasks: 'My Tasks',
    allTasks: 'All Tasks',
    createTask: 'Create Task',
    editTask: 'Edit Task',
    taskTitle: 'Task Title',
    taskDescription: 'Task Description',
    assignedTo: 'Assigned To',
    dueDate: 'Due Date',
    priority: 'Priority',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    status: 'Status',
    inProgress: 'In Progress',
    noTasks: 'No Tasks',
  },

  // Inventory
  inventoryPage: {
    title: 'Inventory',
    aggregated: 'Aggregated',
    byLocation: 'By Location',
    onHand: 'On Hand',
    reserved: 'Reserved',
    damaged: 'Damaged',
    adjustInventory: 'Adjust Inventory',
    quantity: 'Quantity',
    reason: 'Reason',
    location: 'Location',
    alerts: 'Alerts',
    noAlerts: 'No Alerts',
  },

  // My Inventory
  myInventoryPage: {
    title: 'My Inventory',
    subtitle: 'Review and edit your products. Update quantities and sync changes to the hub',
    totalUnits: 'Total draft units',
    saveChanges: 'Save Changes',
    syncing: 'Syncing…',
    loadingInventory: 'Loading personal inventory…',
    remove: 'Remove',
    quantityInVehicle: 'Quantity in vehicle',
    noItemsAssigned: 'No items assigned to you currently',
    addNewProduct: 'Add new product',
    selectProduct: 'Select product from list',
    add: 'Add',
    errorLoadingInventory: 'Error loading personal inventory',
    selectProductToAdd: 'Select product to add',
    productNotFound: 'Product not found',
    cannotSyncInventory: 'Cannot sync inventory in current system',
    inventoryUpdated: 'Inventory updated',
    updatedAndRemoved: 'updated, removed',
    errorUpdatingInventory: 'Error updating inventory',
    driverInventoryUpdate: 'Driver inventory update in app',
  },

  // Driver Status
  driverStatusPage: {
    title: 'Driver Status',
    available: 'Available for deliveries',
    delivering: 'In active delivery',
    onBreak: 'On break',
    offShift: 'Off shift',
    notAvailable: 'Not available',
    statusUnavailable: 'System does not support driver status tracking',
    errorLoadingStatus: 'Error loading status data',
    cannotUpdateStatus: 'Cannot update driver status in current system',
    driverLoggedOut: 'Driver logged out',
  },

  // Manager Inventory
  managerInventoryPage: {
    title: 'Manager Inventory Control',
    subtitle: 'Quick overview of low stock, pending restock requests and notable movements',
    lowStockProducts: 'Low Stock Products',
    pendingApproval: 'Pending Approval',
    approvedPending: 'Approved Pending',
    alerts: 'Alerts',
    loadingData: 'Loading data...',
    noData: 'No data to display',
    available: 'Available',
    allocated: 'Allocated',
    activeLocations: 'Active Locations',
    alertThreshold: 'Alert Threshold',
  },

  // Reports
  reportsPage: {
    title: 'Reports',
    overview: 'Overview',
    sales: 'Sales',
    revenue: 'Revenue',
    orders: 'Orders',
    performance: 'Performance',
    dateRange: 'Date Range',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    totalRevenue: 'Total Revenue',
    averageOrder: 'Average Order',
    revenueByDay: 'Revenue by Day',
    ordersByStatus: 'Orders by Status',
    topProducts: 'Top Products',
    salesCount: 'Sales Count',
    loadingReport: 'Loading report...',
    errorLoading: 'Error loading report',
  },

  // Settings
  settingsPage: {
    title: 'Settings',
    subtitle: 'Personal Management System',
    basicSettings: 'Basic Settings',
    personalManagementSystem: 'Personal Management System',
    userProfile: 'User Profile',
    securitySection: 'Security',
    actions: 'Actions',
    account: 'Account',
    preferences: 'Preferences',
    security: 'Security',
    notifications: 'Notifications',
    changeRole: 'Change Role',
    currentRole: 'Current Role',
    selectNewRole: 'Select New Role',
    switchRole: 'Switch Role',
    roleChanged: 'Role changed successfully',
    clearCache: 'Clear Cache',
    clearCacheSubtitle: 'Delete local data',
    cacheCleared: 'Cache cleared',
    cacheClearedSuccess: 'Cache cleared successfully',
    confirmClearCache: 'Delete all saved data?',
    about: 'About',
    aboutSubtitle: 'About the application',
    aboutMessage: 'Royal Logistics Management System\n\nBuilt with React and Telegram WebApp SDK',
    version: 'Version',
    offlineData: 'Offline Data',
    offlineDataSubtitle: 'Check and clear pending requests',
    totalSize: 'Total Size',
    lastSync: 'Last Sync',
    clearOfflineData: 'Clear Offline Data',
    changePIN: 'Change Security Code',
    changePINSubtitle: 'Update your secret code (PIN)',
    enterNewPIN: 'Enter new PIN',
    confirmPIN: 'Confirm PIN',
    lockApp: 'Lock Application',
    lockAppSubtitle: 'Lock the app and return to security code screen',
    userManagement: 'User Management',
    userManagementSubtitle: 'Approve and manage system users',
    logout: 'Logout',
    logoutSubtitle: 'Clear session and return to login screen',
    confirmLogout: 'Are you sure you want to logout?',
    closeApp: 'Close App',
    closeAppSubtitle: 'Return to Telegram',
    requestAdminAccess: 'Request Admin Access',
    requestAdminAccessSubtitle: 'Enter PIN to switch to manager role',
  },

  // Driver Dashboard
  driverDashboard: {
    title: 'Driver Dashboard',
    activeDeliveries: 'Active Deliveries',
    completedToday: 'Completed Today',
    earnings: 'Earnings',
    rating: 'Rating',
    availableOrders: 'Available Orders',
    myRoute: 'My Route',
    acceptOrder: 'Accept Order',
    startDelivery: 'Start Delivery',
    completeDelivery: 'Complete Delivery',
    navigation: 'Navigation',
    customerInfo: 'Customer Info',
    orderDetails: 'Order Details',
    noActiveDeliveries: 'No active deliveries',
  },

  // Dispatch Board
  dispatchBoard: {
    title: 'Dispatch Board',
    unassigned: 'Unassigned',
    assigned: 'Assigned',
    inProgress: 'In Progress',
    availableDrivers: 'Available Drivers',
    assignDriver: 'Assign Driver',
    reassign: 'Reassign',
    viewRoute: 'View Route',
    optimizeRoute: 'Optimize',
    driverLocation: 'Driver Location',
    estimatedTime: 'Estimated Time',
    noOrders: 'No Orders',
  },

  // Warehouse Dashboard
  warehouseDashboard: {
    title: 'Warehouse Dashboard',
    receiving: 'Receiving',
    picking: 'Picking',
    packing: 'Packing',
    shipping: 'Shipping',
    pendingReceiving: 'Pending Receiving',
    pendingPicking: 'Pending Picking',
    readyToShip: 'Ready to Ship',
    lowStock: 'Low Stock',
    restockNeeded: 'Restock Needed',
  },

  myZonesPage: {
    title: 'My Zones',
    subtitle: 'Manage your activity zones, join new zones and set your active zone for real-time tracking',
    systemNotSupported: 'System does not support zone tracking for drivers',
    errorLoadingZones: 'Error loading zone data',
    loadingZones: 'Loading zone data…',
    youAreOnline: '🟢 You are online',
    youAreOffline: '⚪ You are offline',
    activeZone: 'Active Zone',
    refresh: 'Refresh',
    activeZoneLabel: 'Active Zone',
    leaveZone: 'Leave Zone',
    joinZone: 'Join Zone',
    setAsActiveZone: 'Set as Active Zone',
    noZonesAvailable: 'No zones available. Contact manager for assignment',
    cannotUpdateZoneAssignment: 'Cannot update zone assignment in current system',
    joinedZoneSuccessfully: 'Joined zone successfully',
    leftZone: 'Left the zone',
    errorUpdatingZoneAssignment: 'Error updating zone assignment',
    cannotUpdateActiveZone: 'Cannot update active zone in current system',
    zoneSetAsActive: 'Zone set as your active zone',
    errorUpdatingActiveZone: 'Error updating active zone',
    activeZoneUpdate: 'Active zone update',
  },

  zoneManagementPage: {
    title: 'Zone Management',
    subtitle: 'Assign drivers to activity zones',
    loading: 'Loading...',
    errorLoadingZones: 'Error loading zones',
    zoneManagement: 'Zone Management',
    assignDrivers: 'Assign Drivers',
    assignedDrivers: 'Assigned Drivers',
    assignDriver: '+ Assign Driver',
    noDriversAssigned: 'No drivers assigned to this zone',
    remove: 'Remove',
    confirmRemoveDriver: 'Remove this driver from the zone?',
    assignDriverToZone: 'Assign Driver to',
    assign: 'Assign',
    cancel: 'Cancel',
    allDriversAssigned: 'All drivers are already assigned to this zone',
    driverAssignedSuccessfully: 'Driver assigned to zone successfully',
    errorAssigningDriver: 'Error assigning driver',
    driverRemovedSuccessfully: 'Driver removed from zone',
    errorRemovingDriver: 'Error removing driver',
    createZone: 'Create Zone',
    editZone: 'Edit Zone',
    deleteZone: 'Delete Zone',
    zoneDetails: 'Zone Details',
    boundaries: 'Boundaries',
    activeDrivers: 'Active Drivers',
    coverage: 'Coverage',
    capacity: 'Capacity',
    utilization: 'Utilization',
  },

  driversManagementPage: {
    title: 'Driver Management',
    loading: 'Loading drivers...',
    errorLoadingDrivers: 'Error loading drivers',
    driversOutOf: 'drivers out of',
    refresh: 'Refresh',
    refreshing: '⟳',
    filter: 'Filter',
    totalDrivers: 'Total Drivers',
    online: 'Online',
    inDelivery: 'In Delivery',
    averageRating: 'Average Rating',
    searchPlaceholder: 'Search by name, phone or vehicle...',
    all: 'All',
    offline: 'Offline',
    busy: 'Busy',
    available: 'Available',
    onBreak: 'On Break',
    list: 'List',
    map: 'Map',
    analytics: 'Analytics',
    noDriversFound: 'No drivers found',
    tryChangingFilter: 'Try changing the filter or search',
  },

  // User Management
  userManagement: {
    title: 'User Management',
    allUsers: 'All Users',
    activeUsers: 'Active Users',
    inviteUser: 'Invite User',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    userName: 'Username',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    lastLogin: 'Last Login',
    permissions: 'Permissions',
    assignRole: 'Assign Role',
    removeUser: 'Remove User',
    confirmDelete: 'Confirm Delete',
  },

  // Channels
  channelsPage: {
    title: 'Channels',
    myChannels: 'My Channels',
    allChannels: 'All Channels',
    createChannel: 'Create Channel',
    joinChannel: 'Join Channel',
    leaveChannel: 'Leave Channel',
    channelName: 'Channel Name',
    channelDescription: 'Channel Description',
    members: 'Members',
    addMembers: 'Add Members',
    channelSettings: 'Channel Settings',
    privateChannel: 'Private Channel',
    publicChannel: 'Public Channel',
    noChannels: 'No Channels',
  },

  // Chat
  chatPage: {
    title: 'Chat',
    conversations: 'Conversations',
    newMessage: 'New Message',
    typeMessage: 'Type a message',
    sendMessage: 'Send Message',
    encrypted: 'Encrypted',
    online: 'Online',
    offline: 'Offline',
    typing: 'Typing...',
    attachFile: 'Attach File',
    sendImage: 'Send Image',
    noConversations: 'No Conversations',
    startChat: 'Start Chat',
  },

  // Zones
  zonesPage: {
    title: 'Zones',
    allZones: 'All Zones',
    myZones: 'My Zones',
    createZone: 'Create Zone',
    editZone: 'Edit Zone',
    zoneName: 'Zone Name',
    coverage: 'Coverage',
    assignedDrivers: 'Assigned Drivers',
    activeOrders: 'Active Orders',
    zoneCapacity: 'Zone Capacity',
    viewMap: 'View Map',
    noZones: 'No Zones',
  },

  // Analytics
  analyticsPage: {
    title: 'Analytics',
    businessMetrics: 'Business Metrics',
    userGrowth: 'User Growth',
    orderTrends: 'Order Trends',
    revenueForecast: 'Revenue Forecast',
    kpiDashboard: 'KPI Dashboard',
    customReport: 'Custom Report',
    exportData: 'Export Data',
    dateComparison: 'Date Comparison',
    previousPeriod: 'Previous Period',
    growth: 'Growth',
  },

  // Profile
  profilePage: {
    title: 'My Profile',
    subtitle: 'Personal information and account settings',
    loading: 'Loading profile...',
    errorLoading: 'Error loading profile',
    unknownError: 'Unknown error',
    user: 'User',
    role: 'Role',
    telegramId: 'Telegram ID',
    memberSince: 'Member Since',
    accountActions: 'Account Actions',
    settings: 'Settings',
    changeRole: 'Change Role',
    logout: 'Logout',
    confirmLogout: 'Are you sure you want to logout?',
    editProfile: 'Edit Profile',
    personalInfo: 'Personal Info',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    address: 'Address',
    bio: 'Bio',
    avatar: 'Avatar',
    changeAvatar: 'Change Avatar',
    updateProfile: 'Update Profile',
    profileUpdated: 'Profile updated',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
  },

  // Notifications
  notificationsPage: {
    title: 'Notifications',
    allNotifications: 'All Notifications',
    unread: 'Unread',
    markAsRead: 'Mark as Read',
    markAllRead: 'Mark All as Read',
    clearAll: 'Clear All',
    orderUpdates: 'Order Updates',
    systemAlerts: 'System Alerts',
    messages: 'Messages',
    noNotifications: 'No Notifications',
    preferences: 'Preferences',
    enableNotifications: 'Enable Notifications',
  },

  // Incoming
  incomingPage: {
    title: 'Incoming',
    subtitle: 'Track warehouse incoming and inventory transfers',
    pendingReceiving: 'Pending Receiving',
    received: 'Received',
    receiveShipment: 'Receive Shipment',
    shipmentId: 'Shipment ID',
    expectedItems: 'Expected Items',
    receivedItems: 'Received Items',
    inspectItems: 'Inspect Items',
    confirmReceiving: 'Confirm Receiving',
    reportIssue: 'Report Issue',
    noIncoming: 'No Incoming Shipments',
    all: 'All',
    restocks: 'Restocks',
    transfers: 'Transfers',
    restock: 'Restock',
    transfer: 'Transfer',
    incoming: 'Incoming',
    totalIncoming: 'Total Incoming',
    noIncomingOfType: 'No incoming of this type',
    allIncomingWillAppear: 'All warehouse incoming and transfers will appear here',
    unknownProduct: 'Unknown Product',
    from: 'From',
    to: 'To',
    unknownLocation: 'Unknown Location',
    units: 'units',
    id: 'ID',
    inventoryLogUnavailable: 'Inventory log list is unavailable',
    errorLoadingIncoming: 'Error loading incoming logs',
  },

  // Restock Requests
  restockPage: {
    title: 'Restock Requests',
    pendingRequests: 'Pending Requests',
    approved: 'Approved',
    rejected: 'Rejected',
    createRequest: 'Create Request',
    productName: 'Product Name',
    requestedQuantity: 'Requested Quantity',
    urgency: 'Urgency',
    urgent: 'Urgent',
    normal: 'Normal',
    low: 'Low',
    approveRequest: 'Approve Request',
    rejectRequest: 'Reject Request',
    noRequests: 'No Requests',
  },

  // Logs
  logsPage: {
    title: 'Activity Log',
    activityLog: 'Activity Log',
    systemLogs: 'System Logs',
    userActions: 'User Actions',
    timestamp: 'Timestamp',
    action: 'Action',
    user: 'User',
    details: 'Details',
    filterByUser: 'Filter by User',
    filterByAction: 'Filter by Action',
    exportLogs: 'Export Logs',
    noLogs: 'No Logs',
  },

  // My Stats
  myStatsPage: {
    title: 'My Statistics',
    performance: 'Performance',
    completedTasks: 'Completed Tasks',
    hoursWorked: 'Hours Worked',
    efficiency: 'Efficiency',
    achievements: 'Achievements',
    weeklyStats: 'Weekly Statistics',
    monthlyStats: 'Monthly Statistics',
    compareWithTeam: 'Compare with Team',
  },

  // Businesses
  businessesPage: {
    title: 'Businesses',
    myBusinesses: 'My Businesses',
    createBusiness: 'Create Business',
    businessName: 'Business Name',
    businessType: 'Business Type',
    switchBusiness: 'Switch Business',
    manageBusiness: 'Manage Business',
    businessSettings: 'Business Settings',
    noBusinesses: 'No Businesses',
  },

  // My Deliveries
  myDeliveriesPage: {
    title: 'My Deliveries',
    subtitle: 'Your daily route with current status and customer information',
    deliveryId: 'Delivery ID',
    customer: 'Customer',
    address: 'Address',
    deliveryWindow: 'Delivery Window',
    readyToGo: 'Ready to Go',
    onTheWay: 'On the Way',
    delivered: 'Delivered',
    noDeliveries: 'No Deliveries',
  },

  // Driver Dashboard Extended
  driverDashboardExtended: {
    toggleOnline: 'Toggle Status',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    todayEarnings: 'Today\'s Earnings',
    weekEarnings: 'Week Earnings',
    monthEarnings: 'Month Earnings',
    lastLocationUpdate: 'Last Location Update',
    updateLocation: 'Update Location',
    thisPageForDriversOnly: 'This page is for drivers only',
    errorLoadingData: 'Error loading data',
    statusChangeError: 'Error changing status',
    wentOnline: 'Went online',
    wentOffline: 'Went offline',
    acceptingOrders: 'Accepting orders',
    notAcceptingOrders: 'Not accepting orders',
    hello: 'Hello',
    readyForNextDelivery: 'Ready for the next delivery?',
    refresh: 'Refresh',
    onlineAvailable: 'Online - Available for orders',
    offlineUnavailable: 'Offline',
    willReceiveNotifications: 'You will receive notifications for new orders',
    willNotReceiveOrders: 'You will not receive new orders',
    lastLocationUpdateAt: 'Last location update',
    close: 'Close',
    open: 'Open',
    earnings: 'Earnings',
    earningsForPeriod: 'Earnings',
    baseSalary: 'Base Salary',
    tips: 'Tips',
    bonuses: 'Bonuses',
    active: 'Active',
    completedToday: 'Completed Today',
    rating: 'Rating',
    activeHours: 'Active Hours',
    activeOrders: 'Active Orders',
    noOrdersNow: 'No orders right now',
    youAreOffline: 'You are offline',
    nextOrderWillAppear: 'The next order will appear here soon',
    goOnlineToReceiveOrders: 'Go online to receive orders',
  },

  // Dispatch Board Extended
  dispatchBoardExtended: {
    autoAssign: 'Auto Assign',
    manualAssign: 'Manual Assign',
    orderQueue: 'Order Queue',
    driverMap: 'Driver Map',
    filters: 'Filters',
    priority: 'Priority',
    urgentOrders: 'Urgent Orders',
    standardOrders: 'Standard Orders',
    bulkAssign: 'Bulk Assign',
  },

  // Freelancer Driver
  freelancerDriverPage: {
    title: 'Freelancer Driver',
    marketplace: 'Order Marketplace',
    availableOrders: 'Available Orders',
    myAcceptedOrders: 'My Accepted Orders',
    earnings: 'Earnings',
    rating: 'Rating',
    acceptOrder: 'Accept Order',
    viewDetails: 'View Details',
    noAvailableOrders: 'No Available Orders',
  },

  // Infrastructure Owner Dashboard
  infrastructureDashboardPage: {
    title: 'Infrastructure Dashboard',
    overview: 'Overview',
    totalBusinesses: 'Total Businesses',
    activeDrivers: 'Active Drivers',
    warehouseCapacity: 'Warehouse Capacity',
    systemHealth: 'System Health',
    manageInfrastructure: 'Manage Infrastructure',
    viewMetrics: 'View Metrics',
  },

  // Example Dashboard
  exampleDashboardPage: {
    title: 'Example Dashboard',
    sampleData: 'Sample Data',
    demoMode: 'Demo Mode',
    exampleMetrics: 'Example Metrics',
    testFeatures: 'Test Features',
  },

  // Dashboard Common
  dashboardCommon: {
    metrics: 'Metrics',
    kpis: 'KPIs',
    charts: 'Charts',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    viewAll: 'View All',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    thisMonth: 'This Month',
    thisWeek: 'This Week',
    today: 'Today',
    total: 'Total',
    active: 'Active',
    pending: 'Pending',
    growth: 'Growth',
    change: 'Change',
    vs: 'vs',
    lastPeriod: 'Last Period',
  },

  dispatchBoardPage: {
    title: 'Dispatch Board',
    subtitle: 'Real-time delivery management',
    systemNotSupported: 'System not supported',
    errorLoadingCoverage: 'Error loading service coverage',
    realTime: 'Real Time',
    list: 'List',
    kanban: 'Kanban',
    refresh: 'Refresh',
    availableDrivers: 'Available Drivers',
    coverageZones: 'Coverage Zones',
    inDelivery: 'In Delivery',
    waiting: 'Waiting',
    waitingForAssignment: 'Waiting for Assignment',
    assigned: 'Assigned',
    inProgress: 'In Progress',
    completed: 'Completed',
    noWaitingOrders: 'No waiting orders',
    noAssignedOrders: 'No assigned orders',
    noDeliveriesInProgress: 'No deliveries in progress',
    noCompletedOrders: 'No completed orders',
    assignDriverToOrder: 'Assign Driver to Order',
    driver: 'Driver',
    available: 'Available',
    noAvailableDrivers: 'No available drivers',
    driverAssignedSuccessfully: 'Driver assigned successfully',
    errorAssigningDriver: 'Error assigning driver',
    assignDriver: 'Assign Driver',
    loadingDispatchBoard: 'Loading dispatch board...',
  },

  // Landing page translations - will be added below
  landing: {} as LandingTranslations,
};

const englishLanding: LandingTranslations = {
  title: 'UndergroundLab - Smart Local Marketplace',
  subtitle: 'Shop from top local businesses in your area',
  description: 'Quality products, fast delivery to your door - all in one place',
  getStarted: 'Start Shopping',
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

  benefits: {
    title: 'Why Shop With Us?',
    subtitle: 'Perfect shopping experience from home',
    quality: {
      title: 'Guaranteed Quality',
      description: 'Curated products from leading local businesses'
    },
    speed: {
      title: 'Fast Delivery',
      description: 'Get your order the same day'
    },
    variety: {
      title: 'Huge Selection',
      description: 'Hundreds of products and stores in one place'
    },
    trust: {
      title: 'Trust & Transparency',
      description: 'Real-time tracking and complete security'
    }
  },

  howItWorks: {
    title: 'How It Works?',
    subtitle: 'Simple and fast shopping in 4 steps',
    step1: {
      title: 'Browse Catalog',
      description: 'Discover products from various businesses'
    },
    step2: {
      title: 'Add to Cart',
      description: 'Choose your favorite products'
    },
    step3: {
      title: 'Place Order',
      description: 'Confirm your order easily'
    },
    step4: {
      title: 'Receive Quickly',
      description: 'Delivered to your door same day'
    }
  },

  workWithUs: {
    title: 'Want to earn with us?',
    description: 'Join as a business, driver, or part of our team',
    button: 'Work With Us'
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
    title: 'Ready to Order?',
    description: 'Start shopping from top businesses in your area',
    button: 'Start Shopping',
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

// ============================================================================
// React Hook for Components
// ============================================================================

/**
 * React hook for accessing translations in components
 * Usage: const { t, isRTL, formatDate } = useI18n();
 */
export function useI18n() {
  const translations = i18n.getTranslations();
  const isRTL = i18n.isRTL();
  const language = i18n.getLanguage();

  // Helper to get nested translation keys
  const t = (key: string, ...path: string[]): string => {
    if (path.length === 0) {
      return translations[key] || key;
    }

    let value: any = translations[key];
    for (const p of path) {
      if (value && typeof value === 'object') {
        value = value[p];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  return {
    t,
    translations,
    isRTL,
    language,
    setLanguage: (lang: Language) => i18n.setLanguage(lang),
    formatCurrency: language === 'he' ? formatCurrency : formatCurrencyEN,
    formatDate: language === 'he' ? formatDate : formatDateEN,
    formatTime: language === 'he' ? formatTime : formatTimeEN,
    formatDateTime,
  };
}
