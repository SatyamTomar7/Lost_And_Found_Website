export const COLOR_OPTIONS = [
  { name: "Black", value: "#111827" },
  { name: "White", value: "#ffffff" },
  { name: "Grey", value: "#6b7280" },
  { name: "Silver", value: "#c0c0c0" },
  { name: "Gold", value: "#d4af37" },
  { name: "Red", value: "#dc2626" },
  { name: "Blue", value: "#2563eb" },
  { name: "Navy Blue", value: "#1e3a8a" },
  { name: "Light Blue", value: "#93c5fd" },
  { name: "Sky Blue", value: "#38bdf8" },
  { name: "Green", value: "#16a34a" },
  { name: "Dark Green", value: "#166534" },
  { name: "Yellow", value: "#facc15" },
  { name: "Orange", value: "#f97316" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#ec4899" },
  { name: "Brown", value: "#92400e" },
  { name: "Beige", value: "#d6c7a1" },
  { name: "Tan", value: "#c2a477" },
  { name: "Maroon", value: "#800000" },
  { name: "Teal", value: "#0d9488" },
  { name: "Magenta", value: "#c026d3" },
  { name: "Lavender", value: "#c4b5fd" },
  { name: "Charcoal", value: "#36454f" },
  { name: "Multi-colored", value: "#7c3aed" },
  { name: "Other", value: "#9ca3af" },
];

// Keep the string list available for consumers that only need submitted values.
export const COLORS = COLOR_OPTIONS.map(({ name }) => name);

export const ITEM_NAME = [
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

export const ITEM_CONDITIONS = {
  NEW: "New",
  USED: "Used",
};

export const FOUND_ITEM_RECOVERY_MODES = {
  NORMAL: "normal",
  ENQUIRY_RECOVERED: "enquiry_recovered",
};

export const BLOCK_LOCATIONS = {
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

export const COMMON_LOCATIONS = [
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
export const COURSES = [
  "B.Tech",
  "M.Tech",
  "B.Sc",
  "M.Sc",
  "BCA",
  "MCA",
  "BBA",
  "MBA",
  "B.Com",
  "BA",
  "MA",
  "B.Pharm",
  "M.Pharm",
  "BA LLB",
  "BBA LLB",
  "LLB",
  "LLM",
  "B.Des",
  "M.Des",
  "B.Arch",
  "M.Plan",
  "PhD",
  "B.Sc + M.Sc",
  "Bachelor of Interior Design",
  "Master of Interior Design",
  "Bachelor in Clinical Psychology",
];

export const COURSE_BRANCHES = {
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

export const SEMESTER_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
export const NOTIFICATION_TYPES = {
  MATCH_FOUND: "match_found",
  ITEM_RETURNED: "item_returned",
  ITEM_UNAVAILABLE: "item_unavailable",
  MATCH_REMOVED: "match_removed",
  ITEM_TRANSFERRED_TO_SECURITY: "item_transferred_to_security",
};
export const YEAR_OPTIONS = ["1", "2", "3", "4"];
export const SECTION_OPTIONS = ["A", "B", "C", "D", "E"];
export const BLOCK_OPTIONS = ["A", "B", "C", "D", "E"];
export const getLocationsByRole = (role, block) => {
  const allLocations = [
    ...Object.values(BLOCK_LOCATIONS).flat(),
    ...COMMON_LOCATIONS,
  ];

  // Security → all campus locations
  if (role === "security") {
    return allLocations;
  }

  // Student + Admin → own block + common locations
  if (role === "student" || role === "admin") {
    return [...(BLOCK_LOCATIONS[block] || []), ...COMMON_LOCATIONS];
  }

  return [];
};
