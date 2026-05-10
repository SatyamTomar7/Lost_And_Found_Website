export const COLORS = [
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

export const ITEM_NAME = [
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

export const ITEM_CONDITIONS = {
  NEW: "New",
  USED: "Used",
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
];
export const COURSES = [
  "B.Tech",
  "M.Tech",
  "BCA",
  "MCA",
  "B.Sc",
  "M.Sc",
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
  "PhD"
];

export const BRANCHES = [
  "CSE",
  "CSE (AI & ML)",
  "CSE (Data Science)",
  "Cyber Security",
  "IoT",
  "IT",
  "ECE",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Biotechnology",
  "Computer Science",
  "Artificial Intelligence",
  "Forensic Science",
  "Environmental Science",
  "Commerce",
  "Management",
  "Law",
  "Fashion Design",
  "Interior Design",
  "Architecture",
  "Psychology",
  "Journalism & Mass Communication",
  "Animation & Visual Graphics",
  "English",
  "Economics",
  "Political Science",
  "History",
  "Biology",
  "Pharmacy"
];
export const SEMESTER_OPTIONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
];
export const YEAR_OPTIONS = ["1", "2", "3", "4"];
export const SECTION_OPTIONS = ["A", "B", "C", "D", "E"];
export const BLOCK_OPTIONS = ["A", "B", "C", "D", "E"];
export const getLocationsByRole = (role, block) => {
  // Student → all locations
  if (role === "student") {
    return [
      ...Object.values(BLOCK_LOCATIONS).flat(),
      ...COMMON_LOCATIONS,
    ];
  }

  // Admin → own block + common locations
  if (role === "admin") {
    return [
      ...(BLOCK_LOCATIONS[block] || []),
      ...COMMON_LOCATIONS,
    ];
  }

  // Security → all locations
  if (role === "security") {
    return [
      ...Object.values(BLOCK_LOCATIONS).flat(),
      ...COMMON_LOCATIONS,
    ];
  }



  return [];
};