const DB_NAME="LOST_AND_FOUND_AMITY"
const USER_ROLES = {
  STUDENT: "student",
  ADMIN: "admin",
};

 // Departments/Blocks
const  DEPARTMENTS=[
    'Block A',
    'Block B', 
    'Block C',
    'Block D',
    'Block E'
  ]

    // Categories
 const ITEM_CATEGORIES= [
    'Electronics',
    'Accessories',
    'Books',
    'Clothing',
    'Daily Items',
    'Jewelry',
    'Documents',
    'Sports Equipment',
    'Other'
  ]
const ITEM_STATUS = {
  PENDING: 'pending',
  FOUND: 'found',
  COLLECTED: 'collected',
  RETURNED: 'returned',
  UNCLAIMED: 'unclaimed'
};

    // Colors
 const COLORS= [
    'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple',
    'Pink', 'Brown', 'Black', 'White', 'Grey', 'Silver',
    'Gold', 'Multi-colored', 'Other'
  ]

const NOTIFICATION_TYPES= {
  MATCH_FOUND: 'match_found',
  ITEM_RETURNED: 'item_returned',
  ITEM_CLAIMED: 'item_claimed',
  SYSTEM_ALERT: 'system_alert'
}

  // File upload
 const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    UPLOAD_PATH: 'uploads/items/'
  }

export {DB_NAME,USER_ROLES,DEPARTMENTS,ITEM_CATEGORIES,COLORS,ITEM_STATUS,NOTIFICATION_TYPES,FILE_UPLOAD}