const DB_NAME = "LOST_AND_FOUND_AMITY";
const USER_ROLES = {
  STUDENT: "student",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  DIRECTOR: "director",
  SECURITY: "security",
};

// Departments/Blocks
const DEPARTMENTS = ["Block A", "Block B", "Block C", "Block D", "Block E"];
const FILE_UPLOAD = {
  MAX_SIZE:
    Number.parseInt(process.env.UPLOAD_MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
  UPLOAD_PATH: "uploads/items/",
  CLOUDINARY_TIMEOUT_MS:
    Number.parseInt(process.env.UPLOAD_CLOUDINARY_TIMEOUT_MS, 10) || 60_000,
};

const ITEM_NAME = [
  "Earbuds",
  "Earphones",
  "Headphones",
  "Helmet",
  "Bag",
  "Laptop",
  "Mobile Phone",
  "Mobile Cover",
  "Mouse",
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
  "Non-SmartWatch",
  "Umbrella",
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
const FOUND_ITEM_RECOVERY_MODES = {
  NORMAL: "normal",
  ENQUIRY_RECOVERED: "enquiry_recovered",
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
  ITEM_TRANSFERRED_TO_SECURITY: "item_transferred_to_security",
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

  "Near Block A",
  "Near Block B",
  "Near Block C",
  "Near Block D",
  "Near Block E",

  "Road Between Block A & B",
  "Road Between Block A & D",
  "Road Between Block B & C",
  "Road Between Block C & E",
  "Road Between Block D & E",

  "H1 Hostel",
  "H2 Hostel",
  "H3 Hostel",
  "H4 Hostel",
  "H5 Hostel",
  "Hostel Common Area",
  "Hosteler Mess",
  "Dayscholar Mess",
  "Unknown",
];

const COURSE_BRANCHES = {
  "B.Tech": [
    "Civil Engineering",
    "Computer Science & Engineering",
    "Electronics & Communication Engineering",
    "Information Technology",
    "Mechanical Engineering",
    "Biotechnology",
  ],
  "M.Tech": [
    "Civil Engineering",
    "Computer Science & Engineering",
    "Electronics & Communication Engineering",
    "Mechanical Engineering",
    "Biotechnology",
    "Structural Engineering",
    "VLSI Design",
  ],
  "B.Sc": [
    "Biology",
    "Biotechnology",
    "Clinical Psychology",
    "Computer Science",
    "Forensic Sciences",
    "Animation & Visual Graphics",
  ],
  "M.Sc": [
    "Biotechnology",
    "Environmental Sciences",
    "Artificial Intelligence & Cyber Security",
  ],
  BCA: ["General", "Artificial Intelligence & Cyber Security"],
  MCA: ["General"],
  BBA: ["General"],
  MBA: ["General"],
  "B.Com": ["General"],
  BA: [
    "Economics",
    "English",
    "History",
    "Journalism & Mass Communication",
    "Political Science",
    "Applied Psychology",
  ],
  MA: [
    "English",
    "Journalism & Mass Communication",
    "Applied Psychology",
    "Clinical Psychology",
  ],
  "B.Pharm": ["General"],
  "M.Pharm": ["Pharmaceutics", "Pharmacology"],
  "BA LLB": ["General"],
  "BBA LLB": ["General"],
  LLB: ["General"],
  LLM: ["General"],
  "B.Des": ["Fashion Design"],
  "M.Des": ["Fashion Design"],
  "B.Arch": ["General"],
  "M.Plan": ["Urban & Regional Planning"],
  PhD: [],
  "B.Sc + M.Sc": ["Biotechnology (Dual Degree)"],
  "Bachelor of Interior Design": ["General"],
  "Master of Interior Design": ["General"],
  "Bachelor in Clinical Psychology": ["General"],
};

const COURSES = Object.keys(COURSE_BRANCHES);

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
  FOUND_ITEM_RECOVERY_MODES,
  NOTIFICATION_TYPES,
  ITEM_NAME,
  ITEM_CONDITIONS,
  ITEM_CONDITIONS_VALUES,
  COURSES,
  COURSE_BRANCHES,
  FILE_UPLOAD,
};
