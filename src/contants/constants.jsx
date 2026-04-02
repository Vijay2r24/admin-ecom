import dayjs from "dayjs";

export const STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  FAILURE: "failure",
  DELIVERED: "Delivered",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  CANCELLED: "cancelled",
};

export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error", 
  WARNING: "warning",
  INFO: "info"
};

export const NOTIFICATION_MESSAGES = {
  LOGOUT_SUCCESS: "Logged out successfully",
  LOGIN_SUCCESS: "Logged in successfully",
  PROFILE_UPDATED: "Profile updated successfully",
  SETTINGS_SAVED: "Settings saved successfully",
  OPERATION_SUCCESS: "Operation completed successfully"
};

export const PRODUCT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  OUT_OF_STOCK: "out_of_stock"
};

export const PRODUCT_STATUS_LABELS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive", 
  OUT_OF_STOCK: "Out of Stock"
};

export const DEFAULT_COLOR = "#000000";

export const COLORS = {
  GRAY_PRIMARY: "#e5efff",
  PRIMARY: "#3498db",
  SECONDARY: "#2ecc71",
  ERROR: "#e74c3c",
};

export const CUSTOM_COLORS = {
  primary: "#FF5A5F",
  primaryHover: "#E14E53",
  divider: "#FF5A5F",
  text: "#FFFFFF",
};

export const STATUS_VALUES = {
  ALL: "",
  BOOLEAN_ACTIVE: "true",
  BOOLEAN_INACTIVE: "false",
};

// Make sure it matches what your API expects
export const STATUS_OPTIONS = [
  { value: "", labelKey: "COMMON.ALL" },
  { value: "true", labelKey: "COMMON.ACTIVE" }, 
  { value: "false", labelKey: "COMMON.INACTIVE" },
];

export const ITEMS_PER_PAGE = 10;
export const LOCALE = "en-US";
export const CURRENCY = "INR";
export const ORDER_STATUS = {
  DELIVERED: "Delivered",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  SHIPPED: "Shipped",
  RETURNED: "Returned",
  PROCESSING: "Processing",
};

export const STATUS_DROPDOWN_OPTIONS = [
  { value: "true", labelKey: "COMMON.ACTIVE" },
  { value: "false", labelKey: "COMMON.INACTIVE" },
];

export const DEFAULT_PAGE = 1;
export const DASHBOARD_DEFAULT_LIMIT = 7;
export const BANNER_WIDTH = 1200;
export const BANNER_HEIGHT = 600;

export const FILTERS = {
  STATUS: "status",
};

export const FORM_MODES = {
  CREATE: "create",
  EDIT: "edit",
};

export const VIEW_TYPES = {
  GRID: "grid",
  LIST: "list",
};

export const DATE_PICKER_CONFIG = {
  PRIMARY_COLOR: "purple",
  POPOVER_DIRECTION: "down",
  DISPLAY_FORMAT: "YYYY-MM-DD",
};

export const EXPORT_TYPES = {
  ORDER: "order",
  STORE: "store",
  PRODUCT: "product",
  PAYMENT: "payment",
  TEMPLATE: "template",
};

export const DOWNLOAD_ICON = (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export const TOAST_DURATION = {
  SHORT: 1500,
  MEDIUM: 3000,
  LONG: 5000,
  TO_LONG: 10000,
};

export const DATE_FORMAT_OPTIONS = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

export const REPORT_FILE_NAMES = {
  ORDERS: `orders-report-${getTodayDate()}.xlsx`,
  STORES: `stores-report-${getTodayDate()}.xlsx`,
  PRODUCTS: `products-report-${getTodayDate()}.xlsx`,
  PAYMENTS: `payments-report-${getTodayDate()}.xlsx`,
};

export const PASSWORD_VISIBILITY = {
  SHOW: "text",
  HIDE: "password",
};

export const PASSWORD_LABELS = {
  SHOW: "Hide",
  HIDE: "Show",
};

export const PASSWORD_ARIA = {
  SHOW: "Show password",
  HIDE: "Hide password",
};

export const LOCALES = {
  ENGLISH_US: "en-US",
  ENGLISH_INDIA: "en-IN",
};

export const customShortcuts = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date();
      return [today, today];
    },
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return [yesterday, yesterday];
    },
  },
  {
    label: "Last 7 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return [start, end];
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const start = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );
      const end = new Date();
      return [start, end];
    },
  },
  {
    label: "Last Month",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [start, end];
    },
  },
];

export const SHORTCUT_LABELS = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  LAST_7_DAYS: "Last 7 days",
  LAST_30_DAYS: "Last 30 days",
  THIS_MONTH: "This month",
  LAST_HOUR: "Last 1 hour",
  LAST_2_HOURS: "Last 2 hours",
  LAST_3_HOURS: "Last 3 hours",
  LAST_6_HOURS: "Last 6 hours",
  LAST_12_HOURS: "Last 12 hours",
  LAST_24_HOURS: "Last 24 hours",
};

export const TIME_PERIODS = {
  DAYS: {
    TODAY: 0,
    YESTERDAY: -1,
    LAST_7_DAYS: -6,
    LAST_30_DAYS: -29,
  },
  HOURS: {
    LAST_HOUR: -1,
    LAST_2_HOURS: -2,
    LAST_3_HOURS: -3,
    LAST_6_HOURS: -6,
    LAST_12_HOURS: -12,
    LAST_24_HOURS: -24,
  },
};

export const GENDER_OPTIONS = [
  { value: "Male", labelKey: "ADD_USER.GENDER_MALE" },
  { value: "Female", labelKey: "ADD_USER.GENDER_FEMALE" },
  { value: "Other", labelKey: "ADD_USER.GENDER_OTHER" },
];

export const KEYBOARD_EVENTS = {
  ENTER: "Enter",
  ESCAPE: "Escape",
  TAB: "Tab",
  SPACE: "Space",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  KEYDOWN: "keydown",
};

export const LOGIN_VIEWS = {
  LOGIN: "login",
  REGISTER: "register",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
};

export const VIEW_MODES = {
  TABLE: "table",
  GRID: "grid",
};

export const FILE_CONSTANTS = {
  BRAND_LOGO_PREFIX: "brand-logo",
  CATEGORY_IMAGE_PREFIX: "category-image",
  FILE_TYPE: "image/jpeg",
  IMAGE_SIZE_TEXT: " PNG, JPG, JPEG up to 10MB",
  IMAGE_TITLE_TEXT: "Remove image",
  UPLOAD_LOGO: "Upload Logo",
  BULK_IMPORT_FILE_TYPES: ".xlsx,.xls,.csv",
};

export const TOOLTIPSTATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  NO_PERMISSION: "You don’t have permission to change status",
};

export const TOOLTIP_MESSAGES = {
  // Common actions
  EDIT: "Edit",
  DELETE: "Delete", 
  VIEW: "View",
  SAVE: "Save",
  CANCEL: "Cancel",
  
  // Order specific
  EDIT_ORDER_ITEM: "Edit Item Status",
  NO_ORDER_EDIT_PERMISSION: "No edit permission",
  VIEW_ORDER_HISTORY: "View Item History", 
  NO_HISTORY_PERMISSION: "No history permission",
  SAVE_ORDER_CHANGES: "Save Changes",
  NO_SAVE_PERMISSION: "No save permission",
  
  // Permission messages
  NO_PERMISSION: "No permission",
  NO_DELETE_PERMISSION: "No delete permission",
  NO_EDIT_PERMISSION: "No edit permission",
  NO_EXPORT_PERMISSION: "No export permission",
  
  // Status messages
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  
  // Form actions
  SUBMIT: "Submit",
  RESET: "Reset",
  CLEAR: "Clear",
  SEARCH: "Search",
  FILTER: "Filter",
  
  // Navigation
  BACK: "Back",
  NEXT: "Next",
  PREVIOUS: "Previous",
  CLOSE: "Close",
  
  // File operations
  UPLOAD: "Upload",
  DOWNLOAD: "Download",
  REMOVE: "Remove",
  ATTACH: "Attach",
  
  // Common messages
  LOADING: "Loading...",
  PROCESSING_ACTION: "Processing...",
  SUBMITTING: "Submitting...",
  SAVING: "Saving...",
  
  // Help messages
  REQUIRED_FIELD: "This field is required",
  INVALID_FORMAT: "Invalid format",
  MIN_LENGTH: "Minimum length required",
  MAX_LENGTH: "Maximum length exceeded",
  
  // Feature specific
  PLAY: "Play",
  PAUSE: "Pause",
  STOP: "Stop",
  REFRESH: "Refresh",
  SETTINGS: "Settings",
  CONFIGURE: "Configure",
  
  // Permission specific
  ACCESS_DENIED: "Access denied",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  CONTACT_ADMIN: "Contact administrator",
  
  // Data operations
  IMPORT: "Import",
  EXPORT: "Export",
  SYNC: "Sync",
  BACKUP: "Backup",
  RESTORE: "Restore",
  
  // UI actions
  EXPAND: "Expand",
  COLLAPSE: "Collapse",
  MAXIMIZE: "Maximize",
  MINIMIZE: "Minimize",
  FULLSCREEN: "Fullscreen",
  
  // Content actions
  COPY: "Copy",
  CUT: "Cut", 
  PASTE: "Paste",
  DUPLICATE: "Duplicate",
  CLONE: "Clone",
  
  // Sorting and filtering
  SORT_ASC: "Sort ascending",
  SORT_DESC: "Sort descending", 
  CLEAR_FILTER: "Clear filter",
  APPLY_FILTER: "Apply filter",
  
  // Selection actions
  SELECT_ALL: "Select all",
  DESELECT_ALL: "Deselect all",
  SELECT_NONE: "Select none",
  
  // Bulk actions
  BULK_EDIT: "Bulk edit",
  BULK_DELETE: "Bulk delete",
  BULK_EXPORT: "Bulk export",
  BULK_IMPORT: "Bulk import",
  
  // Status indicators
  ONLINE: "Online",
  OFFLINE: "Offline",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  
  // Time based
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This week",
  THIS_MONTH: "This month",
  THIS_YEAR: "This year",
  
  // Priority
  HIGH_PRIORITY: "High priority",
  MEDIUM_PRIORITY: "Medium priority",
  LOW_PRIORITY: "Low priority",
  URGENT: "Urgent",
  NORMAL: "Normal",
  
  // Validation
  VALID: "Valid",
  INVALID: "Invalid",
  SUCCESS: "Success",
  ERROR: "Error",
  WARNING: "Warning",
  INFO: "Info",
  
  // User actions
  LOGIN: "Login",
  LOGOUT: "Logout",
  SIGNUP: "Sign up",
  SIGNIN: "Sign in",
  REGISTER: "Register",
  
  // Communication
  SEND: "Send",
  RECEIVE: "Receive",
  REPLY: "Reply",
  FORWARD: "Forward",
  ARCHIVE: "Archive",
  
  // Organization
  CREATE: "Create",
  UPDATE: "Update",
  MODIFY: "Modify",
  REMOVE_ITEM: "Remove item",
  ADD_ITEM: "Add item",
  
  // Display
  SHOW: "Show",
  HIDE: "Hide",
  TOGGLE: "Toggle",
  SWITCH: "Switch",
  CHANGE: "Change",
  
  // Navigation hints
  GO_TO_PAGE: "Go to page",
  GO_BACK: "Go back",
  GO_FORWARD: "Go forward",
  GO_HOME: "Go home",
  
  // Help and support
  HELP: "Help",
  SUPPORT: "Support",
  DOCUMENTATION: "Documentation",
  TUTORIAL: "Tutorial",
  GUIDE: "Guide",
  
  // Security
  SECURE: "Secure",
  UNSECURE: "Unsecure",
  ENCRYPTED: "Encrypted",
  DECRYPTED: "Decrypted",
  
  // Performance
  OPTIMIZE: "Optimize",
  COMPRESS: "Compress",
  DECOMPRESS: "Decompress",
  
  // Media
  PLAY_MEDIA: "Play media",
  PAUSE_MEDIA: "Pause media",
  STOP_MEDIA: "Stop media",
  
  // Custom messages
  CUSTOM_ACTION: "Custom action",
  CLICK_TO_ACTION: "Click to action",
  HOVER_FOR_DETAILS: "Hover for details",
  DOUBLE_CLICK: "Double click",
  RIGHT_CLICK: "Right click",
  
  // Accessibility
  SCREEN_READER_ONLY: "Screen reader only",
  KEYBOARD_SHORTCUT: "Keyboard shortcut",
  ACCESSIBILITY_MODE: "Accessibility mode",
  
  // Development
  DEBUG: "Debug",
  TEST: "Test",
  PREVIEW: "Preview",
  DEMO: "Demo",
  
  // Miscellaneous
  OTHER: "Other",
  MISC: "Miscellaneous",
  CUSTOM: "Custom",
  DEFAULT: "Default",
  AUTO: "Auto",
  MANUAL: "Manual",
};

export const MODULES = {
  DASHBOARD: "Dashboard Management",
  ORDER: "Order Management",
  STORE: "Store Management",
  USER: "User Management",
  ROLE: "Role Management",
  CONTENT: "Content Management",
  PRODUCT: "Product Management",
  PRODUCT_SETUP: "Product Setup",
  PAYMENT: "Payment Management",
  BANNER: "Banner Management",
};

// Permission mappings for role management
export const EDIT_TO_VIEW_PERMISSION_MAPPINGS = {
  "edit user": "view user details",
  "edit role": "view role details", 
  "edit store": "view store details",
  "edit product": "view product details",
  "edit banner": "view banner details",
  "view banners": "view banner details",
  "edit brand": "view brand details",
  "edit category": "view category details",
  "edit attribute": "view attribute details",
  "edit attribute type": "view attribute type details",
  "edit specification type": "view specification type details",
  "edit product group": "view product group details",
  "edit order": "view order details",
  "edit customer": "view customer details",
  "edit coupon": "view coupon details",
  "edit notification": "view notification details",
  "edit page": "view page details"
};

export const VIEW_TO_EDIT_PERMISSION_MAPPINGS = {
  "view user details": "edit user",
  "view role details": "edit role", 
  "view store details": "edit store",
  "view product details": "edit product",
  "view banner details": "edit banner",
  "view brand details": "edit brand",
  "view category details": "edit category",
  "view attribute details": "edit attribute",
  "view attribute type details": "edit attribute type",
  "view specification type details": "edit specification type",
  "view product group details": "edit product group",
  "view order details": "edit order",
  "view customer details": "edit customer",
  "view coupon details": "edit coupon",
  "view notification details": "edit notification",
  "view page details": "edit page"
};

export const PERMISSIONS = {
  EDIT_STORE: "Edit Store",
  VIEW_DASHBOARD: "View Dashboard",
  VIEW_ORDERS: "View Orders",
  VIEW_STORE: "View Store",
  ADD_STORE: "Add Store",
  UPDATE_STORE: "Update Store",
  VIEW_USER: "View User",
  ADD_USER: "Add User",
  UPDATE_USER: "Update user",
  VIEW_ROLE: "View Role",
  ADD_ROLE: "Add Role",
  EDIT_ROLE: "Edit Role",
  VIEW_BANNERS: "View Banners",
  CREATE_BANNER: "Create Banner",
  UPDATE_BANNER: "Update Banner",
  UPDATE_BANNER_SEQUENCE: "Update Banner Sequence",
  SEND_NOTIFICATION: "Send Push Notification",
  VIEW_PRODUCTS: "View Products",
  CREATE_PRODUCT: "Create Product",
  UPDATE_PRODUCT: "Update Product",
  VIEW_BRANDS: "View Brands",
  UPDATE_BRAND: "Update Brand",
  VIEW_CATEGORIES: "View Categories",
  UPDATE_CATEGORY: "Update Category",
  VIEW_ATTRIBUTE_TYPES: "View Attribute Types",
  UPDATE_ATTRIBUTE_TYPE: "Update Attribute Type",
  VIEW_COLOURS: "View Colours",
  UPDATE_COLOUR: "Update Colour",
  VIEW_ATTRIBUTES: "View Attributes",
  UPDATE_ATTRIBUTE: "Update Attribute",
  VIEW_PRODUCT_GROUPS: "View Product Groups",
  UPDATE_PRODUCT_GROUP: "Update Product Group",
  ROLE_MANAGEMENT:"Role Management",
  EDIT_USER: "Edit User",
  EDIT_PAYMENT: "Edit Payment",
  VIEW_PAYMENT_DETAILS: "View Payment Details",
  VIEW_ORDER_DETAILS: "View Order Details",
  UPDATE_ORDER_STATUS: "Update Order Status",
  VIEW_ORDER_HISTORY: "View Order Item Status",
  GENERATE_ORDER_REPORT: "Generate Order Report",
  GENERATE_STORE_REPORT: "Generate Store Report",
  GENERATE_PRODUCT_REPORT: "Generate Product Report",
  GENERATE_PAYMENT_REPORT: "Generate Payment Report",
  
  // Brand permissions
  ADD_BRAND: "Add Brand",
  EDIT_BRAND: "Edit Brand",
  UPDATE_BRAND_STATUS: "Update Brand Status",
  VIEW_BRAND_DETAILS: "View Brand Details",
  
  // Category permissions
  ADD_CATEGORY: "Add Category",
  EDIT_CATEGORY: "Edit Category",
  UPDATE_CATEGORY_STATUS: "Update Category Status",
  VIEW_CATEGORY_DETAILS: "View Category Details",
  
  // Attribute permissions
  ADD_ATTRIBUTE: "Add Attribute",
  EDIT_ATTRIBUTE: "Edit Attribute",
  UPDATE_ATTRIBUTE_STATUS: "Update Attribute Status",
  VIEW_ATTRIBUTE_DETAILS: "View Attribute Details",
  
  // Specification Type permissions
  ADD_SPECIFICATION_TYPE: "Add Specification Type",
  EDIT_SPECIFICATION_TYPE: "Edit Specification Type",
  UPDATE_SPECIFICATION_TYPE_STATUS: "Update Specification Type Status",
  VIEW_SPECIFICATION_TYPE_DETAILS: "View Specification Type Details",
  
  // Attribute Type permissions
  ADD_ATTRIBUTE_TYPE: "Add Attribute Type",
  EDIT_ATTRIBUTE_TYPE: "Edit Attribute Type",
  UPDATE_ATTRIBUTE_TYPE_STATUS: "Update Attribute Type Status",
  VIEW_ATTRIBUTE_TYPE_DETAILS: "View Attribute Type Details",
  
  // Colour permissions
  ADD_COLOUR: "Add Colour",
  EDIT_COLOUR: "Edit Colour",
  UPDATE_COLOUR_STATUS: "Update Colour Status",
  VIEW_COLOURS: "View Colours",
  
  // Product Group permissions
  ADD_PRODUCT_GROUP: "Add Product Group",
  EDIT_PRODUCT_GROUP: "Edit Product Group",
  UPDATE_PRODUCT_GROUP_STATUS: "Update Product Group Status",
  VIEW_PRODUCT_GROUP_DETAILS: "View Product Group Details",
  
  // Brand specific tooltips
  ADD_BRAND_TOOLTIP: "Add new brand",
  EDIT_BRAND_TOOLTIP: "Edit brand details",
  UPDATE_BRAND_STATUS_TOOLTIP: "Update brand status",
  VIEW_BRAND_DETAILS_TOOLTIP: "View brand details",
  
  // Category specific tooltips
  ADD_CATEGORY_TOOLTIP: "Add new category",
  EDIT_CATEGORY_TOOLTIP: "Edit category details", 
  UPDATE_CATEGORY_STATUS_TOOLTIP: "Update category status",
  VIEW_CATEGORY_DETAILS_TOOLTIP: "View category details",
  
  // Attribute specific tooltips
  ADD_ATTRIBUTE_TOOLTIP: "Add new attribute",
  EDIT_ATTRIBUTE_TOOLTIP: "Edit attribute details",
  UPDATE_ATTRIBUTE_STATUS_TOOLTIP: "Update attribute status",
  VIEW_ATTRIBUTE_DETAILS_TOOLTIP: "View attribute details",
  
  // Specification Type specific tooltips
  ADD_SPECIFICATION_TYPE_TOOLTIP: "Add new specification type",
  EDIT_SPECIFICATION_TYPE_TOOLTIP: "Edit specification type details",
  UPDATE_SPECIFICATION_TYPE_STATUS_TOOLTIP: "Update specification type status",
  VIEW_SPECIFICATION_TYPE_DETAILS_TOOLTIP: "View specification type details",
  
  // Attribute Type specific tooltips
  ADD_ATTRIBUTE_TYPE_TOOLTIP: "Add new attribute type",
  EDIT_ATTRIBUTE_TYPE_TOOLTIP: "Edit attribute type details",
  UPDATE_ATTRIBUTE_TYPE_STATUS_TOOLTIP: "Update attribute type status",
  VIEW_ATTRIBUTE_TYPE_DETAILS_TOOLTIP: "View attribute type details",
  
  // Colour specific tooltips
  ADD_COLOUR_TOOLTIP: "Add new colour",
  EDIT_COLOUR_TOOLTIP: "Edit colour details",
  UPDATE_COLOUR_STATUS_TOOLTIP: "Update colour status",
  VIEW_COLOUR_DETAILS_TOOLTIP: "View colour details",
  
  // Product Group specific tooltips
  ADD_PRODUCT_GROUP_TOOLTIP: "Add new product group",
  EDIT_PRODUCT_GROUP_TOOLTIP: "Edit product group details",
  UPDATE_PRODUCT_GROUP_STATUS_TOOLTIP: "Update product group status",
  VIEW_PRODUCT_GROUP_DETAILS_TOOLTIP: "View product group details"
};

export const QUICK_FILTER_VALUES = [
  "last3hours",
  "last6hours",
  "last12hours",
  "last24hours",
  "last2days",
  "last7days",
];

export const QUICK_FILTER_LABELS = [
  "Last 3 Hours",
  "Last 6 Hours",
  "Last 12 Hours",
  "Last 24 Hours",
  "Last 2 Days",
  "Last 7 Days",
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const YEARS = Array.from(
  { length: 20 },
  (_, i) => dayjs().year() - 10 + i
);

export const DATE_FORMATS = {
  display: "MMM DD, HH:mm",
  time: "HH:mm",
  monthYear: "MMM",
  FULL_DATETIME_12_HOUR: "MMM D, YYYY h:mm A",
  DATE_DISPLAY: "MMM D, YYYY",
};

export const DATE_UNITS = {
  DAY: "day",
  DAYS: "days",
  HOUR: "hour",
  HOURS: "hours",
};

export const DEFAULT_COUNTRY = "IN";
export const FILETYPE = "image/jpeg";
export const TYPE_GLOBAL = "global";
export const SCROLL_CONSTANTS = {
  BEHAVIOR: "smooth",
  BLOCK: "center",
};

export const DEFAULT_PROPS = {
  showLabel: true,
  placeholder: "Select date range",
};




export const getDateRangeForFilter = (filter) => {
  const now = dayjs();
  switch (filter) {
    case "today":
      return { start: now.startOf("day"), end: now.endOf("day") };
    case "yesterday":
      return {
        start: now.subtract(1, "day").startOf("day"),
        end: now.subtract(1, "day").endOf("day"),
      };
    case "last7days":
      return {
        start: now.subtract(7, "days").startOf("day"),
        end: now.endOf("day"),
      };
    case "last30days":
      return {
        start: now.subtract(30, "days").startOf("day"),
        end: now.endOf("day"),
      };
    case "last1hour":
      return { start: now.subtract(1, "hour"), end: now };
    case "last12hours":
      return { start: now.subtract(12, "hours"), end: now };
    default:
      return { start: now.startOf("day"), end: now.endOf("day") };
  }
};



export const CALENDAR_CONFIG = {
  totalDays: 42,
  gridColumns: 7,
};

export const MESSAGES = {
  INACTIVE_USER_MESSAGE:
    "Your access permissions have been updated. Kindly <br/> log in again to proceed.",
  DEFAULT_ERROR_MESSAGE: "An unexpected error occurred. Please try again.",
};

export const STYLES = {
  primaryColor: "#FF5A5F",
  textColor: {
    primary: "text-gray-900",
    secondary: "text-gray-600",
    muted: "text-gray-400",
    white: "text-white",
  },
  backgroundColor: {
    primary: "bg-[#FF5A5F]",
    primaryHover: "bg-[#FF5A5F]/20",
    primaryLight: "bg-[#FF5A5F]/10",
    hover: "hover:bg-gray-100",
  },
  border: {
    focus: "focus:ring-1 focus:ring-[#FF5A5F]",
  },
  dimensions: {
    dayCell: "w-6 h-6",
    dropdown: {
      minWidth: {
        month: "min-w-[120px]",
        year: "min-w-[100px]",
      },
    },
  },
};

export const STATUS_VALUE_NAMES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const DIRECTIONS = {
  UP: "up",
  DOWN: "down",
};

export const DATA_TYPES = {
  OBJECT: "object",
  STRING: "string",
  NUMBER:"number",
};

export const COUNTRY_CODES = {
  INDIA: "+91",
  USA: "+1",
  UK: "+44",
};

export const REGEX_CONSTANTS = {
  COMPONENT_NAME: /^[a-zA-Z0-9_]+$/,
  ROLE_NAME: /^[A-Za-z0-9\s\-_]+$/,
};
export const MOCK_NOTIFICATIONS = [
  { id: 1, title: "Order #1234 delivered", time: "2 min ago" },
  { id: 2, title: "New user registered", time: "10 min ago" },
  { id: 3, title: "Stock running low for Laptop", time: "1 hour ago" },
  { id: 4, title: "New order placed", time: "30 min ago" },
  { id: 5, title: "Product out of stock", time: "1 hour ago" },
];

export const SKELETON_TYPES = {
  PRODUCT_TABLE: 'product-table',
  PAYMENT_TABLE: 'payment-table',
  BULK_IMPORT_TABLE: 'bulk-import-table',
  ATTRIBUTE_TYPE_TABLE: 'attribute-type-table',
  ATTRIBUTE_TABLE: 'attribute-table',
  CATEGORY_TABLE: 'category-table',
  BRAND_TABLE: 'brand-table',
  SPECIFICATION_TYPE_TABLE: 'specification-type-table',
  COLOR_TABLE: 'color-table',
  PRODUCT_GRID: 'product-grid',
  USER_TABLE: 'user-table',
  USER_GRID: 'user-grid',
  STORE_TABLE: 'store-table',
  STORE_GRID: 'store-grid',
  ORDER_TABLE: 'order-table',
  ORDER_GRID: 'order-grid',
  BANNER_GRID: 'banner-grid',
  USER_ROLES_TABLE: 'user-roles-table',
  PAGINATION: 'pagination',
  PROFILE: 'profile',
  DEFAULT: 'default',
  NEW_SKELETON_TYPE: 'new-skeleton-type',
};

export const customScrollbarStyles = `
  .max-w-8xl::-webkit-scrollbar {
    display: none;
  }
  .table-scroll-container::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .table-scroll-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .table-scroll-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .table-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

// Permission tooltip functions for AddUserRole component
export const isViewPermissionName = (name) => {
  if (!name || typeof name !== "string") return false;
  const lower = name.toLowerCase().trim();
  return (
    lower.startsWith("view") ||
    lower.includes(" view") ||
    /\bview\b/.test(lower)
  );
};

export const isEditPermissionName = (name) => {
  if (!name || typeof name !== "string") return false;
  const lower = name.toLowerCase().trim();
  return (
    lower.startsWith("edit") ||
    lower.startsWith("update") ||
    lower.includes("edit") ||
    lower.includes("update") ||
    /\b(edit|update)\b/.test(lower)
  );
};

export const getViewPermissionForEdit = (editPermissionName) => {
  if (!editPermissionName || typeof editPermissionName !== "string") return null;
  
  const lower = editPermissionName.toLowerCase().trim();
  
  // Generic mapping: replace "edit"/"update" with "view"
  if (lower.startsWith("edit ")) {
    return "view " + lower.substring(5);
  }
  if (lower.startsWith("update ")) {
    return "view " + lower.substring(7);
  }
  
  return null;
};

export const getEditPermissionForView = (viewPermissionName) => {
  if (!viewPermissionName || typeof viewPermissionName !== "string") return null;
  
  const lower = viewPermissionName.toLowerCase().trim();
  
  // Generic mapping: replace "view" with "edit"
  if (lower.startsWith("view ")) {
    return "edit " + lower.substring(5);
  }
  
  return null;
};

export const getPermissionTooltip = (permission, isEditingAdmin, isAdminRole, modulePermissions = [], t) => {
  const permissionName = permission.Name.toLowerCase().trim();
  const isChecked = permission.IsChecked;
  
  // Helper function to check if a permission is a master view permission
  const isMasterViewPermission = (perm) => {
    const pName = perm.Name.toLowerCase().trim();
    return pName === "view users" || 
           pName === "view stores" || 
           pName === "view products" ||
           pName === "view roles" ||
           pName === "view banners" ||
           pName === "view orders" ||
           pName === "view customers" ||
           pName === "view coupons" ||
           pName === "view notifications" ||
           pName === "view pages" ||
           (pName.startsWith("view ") && !pName.includes("details") && !pName.includes("brands") && !pName.includes("categories") && !pName.includes("attribute types") && !pName.includes("attributes") && !pName.includes("specification types") && !pName.includes("colours") && !pName.includes("product groups"));
  };
  
  // Admin role restrictions
  if (isEditingAdmin || isAdminRole) {
    return t("CREATE_USER_ROLE.TOOLTIPS.ADMIN_ROLE_LOCKED");
  }
  
  // Check if this module has a master view permission and if it's selected
  const masterViewPermission = modulePermissions.find(p => {
    const pName = p.Name.toLowerCase().trim();
    return pName === "view users" || 
           pName === "view stores" || 
           pName === "view products" ||
           pName === "view roles" ||
           pName === "view banners" ||
           pName === "view orders" ||
           pName === "view customers" ||
           pName === "view coupons" ||
           pName === "view notifications" ||
           pName === "view pages" ||
           (pName.startsWith("view ") && !pName.includes("details") && !pName.includes("brands") && !pName.includes("categories") && !pName.includes("attribute types") && !pName.includes("attributes") && !pName.includes("specification types") && !pName.includes("colours") && !pName.includes("product groups"));
  });
  
  const hasMasterPermission = masterViewPermission && masterViewPermission.IsChecked;
  
  // If this is not a master permission and master permission is not selected
  if (!hasMasterPermission && masterViewPermission && !isMasterViewPermission(permission)) {
    return t("CREATE_USER_ROLE.TOOLTIPS.MASTER_PERMISSION_REQUIRED", { permissionName: masterViewPermission.Name });
  }
  
  // View permissions - explain master permission behavior and dependencies
  if (isViewPermissionName(permission.Name)) {
    const permissionName = permission.Name.toLowerCase().trim();
    
    // Master view permissions (basic view permissions that control module access)
    const isMasterViewPermission = permissionName === "view users" || 
                                 permissionName === "view stores" || 
                                 permissionName === "view products" ||
                                 permissionName === "view roles" ||
                                 permissionName === "view banners" ||
                                 permissionName === "view orders" ||
                                 permissionName === "view customers" ||
                                 permissionName === "view coupons" ||
                                 permissionName === "view notifications" ||
                                 permissionName === "view pages" ||
                                 (permissionName.startsWith("view ") && !permissionName.includes("details") && !permissionName.includes("brands") && !permissionName.includes("categories") && !permissionName.includes("attribute types") && !permissionName.includes("attributes") && !permissionName.includes("specification types") && !permissionName.includes("colours") && !permissionName.includes("product groups"));
    
    if (isMasterViewPermission) {
      const moduleName = permissionName.replace('view ', '').toUpperCase();
      if (!isChecked) {
        return t("CREATE_USER_ROLE.TOOLTIPS.MASTER_ENABLES_ALL", { moduleName });
      } else {
        return t("CREATE_USER_ROLE.TOOLTIPS.MASTER_UNLOCKED", { moduleName });
      }
    }
    
    // Independent view permissions (these don't control others and are not controlled by others)
    const independentViewPermissions = [
      "view brands", 
      "view categories", 
      "view attribute types", 
      "view attributes", 
      "view specification types", 
      "view colours",
      "view product groups"
    ];
    
    if (independentViewPermissions.includes(permissionName)) {
      const entityName = permissionName.replace('view ', '');
      if (!isChecked) {
        return t("CREATE_USER_ROLE.TOOLTIPS.VIEW_INDEPENDENT", { entityName });
      } else {
        return t("CREATE_USER_ROLE.TOOLTIPS.VIEW_ACTIVE", { entityName });
      }
    }
    
    // Detailed view permissions (these have corresponding edit permissions)
    const correspondingEdit = getEditPermissionForView(permission.Name);
    if (correspondingEdit) {
      if (!isChecked) {
        return t("CREATE_USER_ROLE.TOOLTIPS.REQUIRED_FOR_EDIT", { editPermission: correspondingEdit });
      } else {
        return t("CREATE_USER_ROLE.TOOLTIPS.DETAIL_VIEW_REQUIRED", { editPermission: correspondingEdit });
      }
    }
    
    // Generic detailed view permission
    if (!isChecked) {
      return t("CREATE_USER_ROLE.TOOLTIPS.VIEW_ALLOWS_DETAILED");
    } else {
      return t("CREATE_USER_ROLE.TOOLTIPS.VIEW_REQUIRED_FOR_MODULE");
    }
  }
  
  // Edit permissions - explain view requirement and reverse dependency
  if (isEditPermissionName(permission.Name)) {
    const requiredView = getViewPermissionForEdit(permission.Name);
    const entityName = permissionName.replace(/^(edit|update) /, '');
    if (requiredView) {
      if (!isChecked) {
        return t("CREATE_USER_ROLE.TOOLTIPS.EDIT_AUTO_SELECTS", { viewPermission: requiredView, entityName });
      } else {
        return t("CREATE_USER_ROLE.TOOLTIPS.EDIT_DESELECTING_REMOVES", { viewPermission: requiredView });
      }
    }
    
    // Generic edit permission
    if (!isChecked) {
      return t("CREATE_USER_ROLE.TOOLTIPS.EDIT_REQUIRES_VIEW");
    } else {
      return t("CREATE_USER_ROLE.TOOLTIPS.EDIT_WITH_VIEW");
    }
  }
  
  // Create/Add permissions
  if (permissionName.includes("create") || permissionName.includes("add")) {
    const entityName = permissionName.replace(/^(create|add) /, '');
    if (!isChecked) {
      return t("CREATE_USER_ROLE.TOOLTIPS.CREATE_ENTITY", { entityName });
    } else {
      return t("CREATE_USER_ROLE.TOOLTIPS.CAN_CREATE_ENTITY", { entityName });
    }
  }
  
  // Delete permissions
  if (permissionName.includes("delete") || permissionName.includes("remove")) {
    const entityName = permissionName.replace(/^(delete|remove) /, '');
    if (!isChecked) {
      return t("CREATE_USER_ROLE.TOOLTIPS.DELETE_ENTITY", { entityName });
    } else {
      return t("CREATE_USER_ROLE.TOOLTIPS.CAN_DELETE_ENTITY", { entityName });
    }
  }
  
  // Update status permissions
  if (permissionName.includes("update status") || permissionName.includes("change status")) {
    const entityName = permissionName.replace(/^(update|change) status /, '');
    if (!isChecked) {
      return t("CREATE_USER_ROLE.TOOLTIPS.CHANGE_STATUS", { entityName });
    } else {
      return t("CREATE_USER_ROLE.TOOLTIPS.CAN_CHANGE_STATUS", { entityName });
    }
  }
  
  // Default generic permission
  if (!isChecked) {
    return t("CREATE_USER_ROLE.TOOLTIPS.CLICK_TO_ENABLE");
  } else {
    return t("CREATE_USER_ROLE.TOOLTIPS.PERMISSION_ENABLED");
  }
};