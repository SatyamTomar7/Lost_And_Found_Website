const DB_NAME = "LOST_AND_FOUND_AMITY";
const USER_ROLES = {
  STUDENT: "student",
  ADMIN: "admin",
  DIRECTOR: "director",
  SECURITY: "security",
};

// Departments/Blocks
const DEPARTMENTS = ["Block A", "Block B", "Block C", "Block D", "Block E"];
const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
  UPLOAD_PATH: "uploads/items/",
};

const ITEM_NAME = [
  "Earbuds",
  "Earphones",
  "Headphones",
  "Laptop",
  "Mobile Phone",
  "Student ID Card",
  "Library Card",
  "Admit Card",
  "Marksheet",
  "Calculator",
  "Laptop Charger",
  "Phone Charger",
  "Power Bank",
  "Money (Cash)",
  "Credit/Debit Card",
  "Wallet",
  "House Keys",
  "Dorm Keys",
  "Smartwatch",
  "Hard Drive",
  "Water Bottle",
  "Glasses Case",
  "Tablet",
  "Bracelet",
  "Earrings",
  "Necklace",
  "Ring",
  "Wristwatch",
  "Other",
];

const ITEM_STATUS = {
  PENDING: "pending",
  FOUND: "found",
  COLLECTED: "collected",
  RETURNED: "returned",
  UNCLAIMED: "unclaimed",
  OFFLINE_RETURNED: "offline returned",
  SELF_RESOLVED: "self resolved",
  MATCHED: "matched",
};
const COLORS = [
  "Black",
  "White",
  "Grey",
  "Silver",
  "Gold",
  "Red",
  "Blue",
  "Navy Blue",
  "Light Blue",
  "Green",
  "Dark Green",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Brown",
  "Beige",
  "Tan",
  "Maroon",
  "Teal",
  "Magenta",
  "Lavender",
  "Charcoal",
  "Multi-colored",
  "Other",
];

const NOTIFICATION_TYPES = {
  MATCH_FOUND: "match_found",
  ITEM_RETURNED: "item_returned",
  ITEM_CLAIMED: "item_claimed",
  SYSTEM_ALERT: "system_alert",
  ITEM_UNAVAILABLE: "item_unavailable",
  MATCH_REMOVED: "match_removed",
  ITEM_TRANSFERRED: "item_transferred",
};

const ITEM_CONDITIONS = {
  NEW: "New",
  USED: "Used",
};
const ITEM_CONDITIONS_VALUES = Object.values(ITEM_CONDITIONS);
const BLOCK_LOCATIONS = {
  A: [
    "Block A - Classrooms",
    "Block A - Corridor / Hallway",
    "Block A - Library",
    "Block A - Canteen",
    "Block A - Seminar Hall",
    "Block A - Parking",
    "Block A - Washroom",
  ],

  B: [
    "Block B - Classrooms",
    "Block B - Corridor / Hallway",
    "Block B - Library",
    "Block B - Canteen",
    "Block B - Auditorium",
    "Block B - Parking",
    "Block B - Washroom",
  ],

  C: [
    "Block C - Classrooms",
    "Block C - Corridor / Hallway",
    "Block C - Library",
    "Block C - Canteen",
    "Block C - Seminar Hall",
    "Block C - Parking",
    "Block C - Washroom",
  ],

  D: [
    "Block D - Classrooms",
    "Block D - Corridor / Hallway",
    "Block D - Library",
    "Block D - Canteen",
    "Block D - Seminar Hall",
    "Block D - Parking",
    "Block D - Washroom",
  ],

  E: [
    "Block E - Classrooms",
    "Block E - Corridor / Hallway",
    "Block E - Library",
    "Block E - Seminar Hall",
    "Block E - Parking",
    "Block E - Washroom",
  ],
};

const COMMON_LOCATIONS = [
  "Main Ground (Open Field)",
  "Cricket Ground (Match Play)",
  "Cricket Practice Nets",
  "Volleyball Court",
  "Basketball Court",
  "Badminton Court",
  "Administrative Office",
  "University Entrance / Main Gate",
  "Main Garden / Open Area",
  "Cafeteria (Main)",
];

const ALL_LOCATIONS = [
  ...Object.values(BLOCK_LOCATIONS).flat(),
  ...COMMON_LOCATIONS,
];

export {
  DB_NAME,
  USER_ROLES,
  DEPARTMENTS,
  BLOCK_LOCATIONS,
  COMMON_LOCATIONS,
  ALL_LOCATIONS,
  COLORS,
  ITEM_STATUS,
  NOTIFICATION_TYPES,
  ITEM_NAME,
  ITEM_CONDITIONS,
  ITEM_CONDITIONS_VALUES,
  FILE_UPLOAD,
};
