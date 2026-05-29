import { FaCheckCircle } from "react-icons/fa";
import {
  LuPackage,
  LuPackageOpen,
  LuShieldCheck,
  LuUsers,
  LuLink,
} from "react-icons/lu";

export const today = new Date().toISOString().split("T")[0];

export const FOUND_ITEM_RECOVERY_MODES = {
  NORMAL: "normal",
  ENQUIRY_RECOVERED: "enquiry_recovered",
};

export const getMinSelectableDate = (
  recoveryMode = FOUND_ITEM_RECOVERY_MODES.NORMAL,
) =>
  new Date(
    Date.now() -
      (recoveryMode === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED ? 29 : 6) *
        24 *
        60 *
        60 *
        1000,
  )
    .toISOString()
    .split("T")[0];

export const minSelectableDate = getMinSelectableDate();

export const BLOCKS = ["A", "B", "C", "D", "E"];

export const LOST_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "matched", label: "Matched" },
  { value: "collected", label: "Collected" },
  { value: "self resolved", label: "Self resolved" },
];

export const FOUND_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "found", label: "Found" },
  { value: "matched", label: "Matched" },
  { value: "returned", label: "Returned" },
  { value: "unclaimed", label: "Unclaimed" },
  { value: "offline returned", label: "Collected offline" },
];

export const PILL_CLASS = {
  pending: "pill-pending",
  matched: "pill-matched",
  collected: "pill-collected",
  returned: "pill-returned",
  unclaimed: "pill-unclaimed",
  "offline returned": "pill-offline",
  "self resolved": "pill-self",
  found: "pill-found",
  admin: "pill-admin",
  security: "pill-security",
};

export const MGMT_STAT_CARDS = (a) => [
  { label: "Students", value: a?.totalUsers, Icon: LuUsers, mod: "navy" },
  {
    label: "Admins & staff",
    value: a?.totalAdmins,
    Icon: LuShieldCheck,
    mod: "gold",
  },
  {
    label: "Lost items",
    value: a?.totalLostItems,
    Icon: LuPackage,
    mod: "teal",
  },
  {
    label: "Found items",
    value: a?.totalFoundItems,
    Icon: LuPackageOpen,
    mod: "navy",
  },
  {
    label: "Matched lost",
    value: a?.totalMatchedLostItems,
    Icon: LuLink,
    mod: "purple",
  },
  {
    label: "Matched found",
    value: a?.totalMatchedFoundItems,
    Icon: FaCheckCircle,
    mod: "green",
  },
];

export const OP_QUERY_KEYS = {
  foundItems: ["foundItems"],
  enquiryRecoveredItems: ["enquiryRecoveredItems"],
  matches: ["matches"],
  notifications: ["admin-notifications"],
};

export const SECURITY_FOUND_ITEMS_LIMIT = "all";

export const OPERATIONAL_QUERY_TIMINGS = {
  dataStaleTime: 30 * 1000,
  dataGcTime: 5 * 60 * 1000,
  activeTabRefetchInterval: 30 * 1000,
  notificationStaleTime: 15 * 1000,
  notificationRefetchInterval: 30 * 1000,
};

export const MGMT_TABS = [
  { id: "admins", label: "Admins", Icon: LuShieldCheck },
  { id: "students", label: "Students", Icon: LuUsers },
  { id: "lostitems", label: "Lost Items", Icon: LuPackage },
  { id: "founditems", label: "Found Items", Icon: LuPackageOpen },
];
