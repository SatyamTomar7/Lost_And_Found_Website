// DirectorDashboard.jsx — AmiFound Director Panel
// Stack: React Query v5, React Icons (lucide-react style via react-icons/lu)

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuUsers, LuShieldCheck, LuPackage, LuPackageOpen,
  LuLink, LuRefreshCw, LuFilter,
  LuChevronLeft, LuChevronRight, LuBuilding2,
} from "react-icons/lu";
import { FaCheckCircle } from "react-icons/fa";
import {
  getDirectorAnalytics,
  getDirectorAdmins,
  getDirectorStudents,
  getDirectorLostItems,
  getDirectorFoundItems,
} from "../services/managementService";


// ── Constants ──────────────────────────────────────────────────────────────
const BLOCKS = ["A", "B", "C", "D", "E"];

const LOST_STATUSES = [
  { value: "",              label: "All statuses"  },
  { value: "pending",       label: "Pending"       },
  { value: "matched",       label: "Matched"       },
  { value: "collected",     label: "Collected"     },
  { value: "self resolved", label: "Self resolved" },
];

const FOUND_STATUSES = [
  { value: "",                label: "All statuses"     },
  { value: "found",           label: "Found"            },
  { value: "matched",         label: "Matched"          },
  { value: "returned",        label: "Returned"         },
  { value: "collected",       label: "Collected"        },
  { value: "unclaimed",       label: "Unclaimed"        },
  { value: "offline returned",label: "Collected offline"},
];

const TABS = [
  { id: "admins",      label: "Admins",       Icon: LuShieldCheck  },
  { id: "students",    label: "Students",     Icon: LuUsers        },
  { id: "lostitems",   label: "Lost Items",   Icon: LuPackage      },
  { id: "founditems",  label: "Found Items",  Icon: LuPackageOpen  },
];

const STAT_CARDS = (a) => [
  { label: "Students",      value: a?.totalUsers,             Icon: LuUsers,       mod: "navy" },
  { label: "Admins & staff",value: a?.totalAdmins,            Icon: LuShieldCheck, mod: "gold" },
  { label: "Lost items",    value: a?.totalLostItems,         Icon: LuPackage,     mod: "teal" },
  { label: "Found items",   value: a?.totalFoundItems,        Icon: LuPackageOpen, mod: "navy" },
  { label: "Matched lost",  value: a?.totalMatchedLostItems,  Icon: LuLink,        mod: "purple"},
  { label: "Matched found", value: a?.totalMatchedFoundItems, Icon: FaCheckCircle, mod: "green" },
];

const PILL_CLASS = {
  pending:          "pill-pending",
  matched:          "pill-matched",
  collected:        "pill-collected",
  returned:         "pill-returned",
  unclaimed:        "pill-unclaimed",
  "offline returned":"pill-offline",
  "self resolved":  "pill-self",
  found:            "pill-found",
  admin:            "pill-admin",
  security:         "pill-security",
};

// ── Tiny helpers ───────────────────────────────────────────────────────────
const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

// ── Micro-components ───────────────────────────────────────────────────────
const Avatar = ({ name }) => (
  <span className="dd-avatar" aria-hidden="true">{initials(name)}</span>
);

const BlockBadge = ({ block }) =>
  block ? <span className="dd-block-badge">{block}</span> : <span className="dd-muted">—</span>;

const Pill = ({ status }) => {
  const key = (status || "").toLowerCase();
  return (
    <span className={`dd-pill ${PILL_CLASS[key] || "pill-pending"}`}>
      {status || "—"}
    </span>
  );
};

// Shimmer rows for table loading state
const ShimmerRows = ({ cols = 6, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="dd-shimmer-row">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j}><div className="shimmer shimmer-cell" /></td>
        ))}
      </tr>
    ))}
  </>
);

// ── Filter bar ─────────────────────────────────────────────────────────────
function FilterBar({ blockFilter, setBlockFilter, statusFilter, setStatusFilter, statusOptions }) {
  return (
    <div className="dd-filter-bar">
      <span className="dd-filter-icon"><LuFilter size={14} /></span>

      {/* Block filter */}
      <div className="dd-filter-group">
        <label className="dd-filter-label">Block</label>
        <div className="dd-select-wrap">
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="dd-select"
            aria-label="Filter by block"
          >
            <option value="">All blocks</option>
            {BLOCKS.map((b) => (
              <option key={b} value={b}>Block {b}</option>
            ))}
          </select>
          <LuBuilding2 className="dd-select-icon" size={13} />
        </div>
      </div>

      {/* Status filter — only when statusOptions provided */}
      {statusOptions && (
        <div className="dd-filter-group">
          <label className="dd-filter-label">Status</label>
          <div className="dd-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="dd-select"
              aria-label="Filter by status"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      <div className="dd-filter-chips">
        {blockFilter && (
          <button
            className="dd-chip"
            onClick={() => setBlockFilter("")}
            aria-label={`Remove block ${blockFilter} filter`}
          >
            Block {blockFilter} ×
          </button>
        )}
        {statusFilter && statusOptions && (
          <button
            className="dd-chip"
            onClick={() => setStatusFilter("")}
            aria-label="Remove status filter"
          >
            {statusOptions.find((s) => s.value === statusFilter)?.label} ×
          </button>
        )}
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
function Pagination({ page, setPage, totalPages }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="dd-pagination">
      <button
        className="dd-page-btn"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <LuChevronLeft size={15} />
      </button>
      <span className="dd-page-info">
        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
      </span>
      <button
        className="dd-page-btn"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <LuChevronRight size={15} />
      </button>
    </div>
  );
}

// ── Table panels ───────────────────────────────────────────────────────────
function AdminsPanel() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["director-admins", page],
    queryFn: () => getDirectorAdmins({ page, limit: 10 }),
    staleTime: 3 * 60 * 1000,
    select: (res) => res.data,
  });

  return (
    <>
      <div className="dd-table-wrap">
        <table className="dd-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Block</th>
              <th>Status</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <ShimmerRows cols={6} />}
            {isError && (
              <tr><td colSpan={6} className="dd-error-cell">{error.message}</td></tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr><td colSpan={6} className="dd-empty-cell">No admins found.</td></tr>
            )}
            {data?.data?.map((a) => (
              <tr key={a._id}>
                <td>
                  <div className="dd-name-cell">
                    <Avatar name={a.name} />
                    <div>
                      <span className="dd-name">{a.name}</span>
                    </div>
                  </div>
                </td>
                <td className="dd-muted dd-sm">{a.email}</td>
                <td><Pill status={a.role} /></td>
                <td><BlockBadge block={a.block} /></td>
                <td>
                  {a.isActive
                    ? <span className="dd-pill pill-returned">Active</span>
                    : <span className="dd-pill pill-unclaimed">Inactive</span>}
                </td>
                <td className="dd-muted dd-sm">{fmtDate(a.lastLogin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={data?.pagination?.totalPages} />
    </>
  );
}

function StudentsPanel() {
  const [page, setPage] = useState(1);
  const [blockFilter, setBlockFilter] = useState("");

  // Reset to page 1 when filter changes
  const handleBlockFilter = (val) => { setBlockFilter(val); setPage(1); };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["director-students", page, blockFilter],
    queryFn: () => getDirectorStudents({ page, limit: 10, block: blockFilter }),
    staleTime: 3 * 60 * 1000,
    select: (res) => res.data,
  });

  return (
    <>
      <FilterBar
        blockFilter={blockFilter}
        setBlockFilter={handleBlockFilter}
        statusFilter=""
        setStatusFilter={() => {}}
        statusOptions={null}
      />
      <div className="dd-table-wrap">
        <table className="dd-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Enrollment no.</th>
              <th>Course / Branch</th>
              <th>Semester</th>
              <th>Block</th>
              <th>Section</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <ShimmerRows cols={6} />}
            {isError && (
              <tr><td colSpan={6} className="dd-error-cell">{error.message}</td></tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr><td colSpan={6} className="dd-empty-cell">No students found.</td></tr>
            )}
            {data?.data?.map((s) => (
              <tr key={s._id}>
                <td>
                  <div className="dd-name-cell">
                    <Avatar name={s.name} />
                    <div>
                      <span className="dd-name">{s.name}</span>
                      <span className="dd-item-sub">{s.email}</span>
                    </div>
                  </div>
                </td>
                <td className="dd-mono">{s.enrollmentNumber}</td>
                <td>
                  <span className="dd-name">{s.course}</span>
                  <span className="dd-item-sub">{s.branch}</span>
                </td>
                <td><span className="dd-pill pill-found">Sem {s.semester}</span></td>
                <td><BlockBadge block={s.block} /></td>
                <td className="dd-muted">{s.section || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={data?.pagination?.totalPages} />
    </>
  );
}

function LostItemsPanel() {
  const [page, setPage] = useState(1);
  const [blockFilter, setBlockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleBlockFilter = (val) => { setBlockFilter(val); setPage(1); };
  const handleStatusFilter = (val) => { setStatusFilter(val); setPage(1); };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["director-lostitems", page, blockFilter, statusFilter],
    queryFn: () =>
      getDirectorLostItems({ page, limit: 10, block: blockFilter, status: statusFilter }),
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });

  return (
    <>
      <FilterBar
        blockFilter={blockFilter}
        setBlockFilter={handleBlockFilter}
        statusFilter={statusFilter}
        setStatusFilter={handleStatusFilter}
        statusOptions={LOST_STATUSES}
      />
      <div className="dd-table-wrap">
        <table className="dd-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Reported by</th>
              <th>Enrollment</th>
              <th>Place lost</th>
              <th>Date lost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <ShimmerRows cols={6} />}
            {isError && (
              <tr><td colSpan={6} className="dd-error-cell">{error.message}</td></tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr><td colSpan={6} className="dd-empty-cell">No lost items found.</td></tr>
            )}
            {data?.data?.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="dd-name">{item.name}</span>
                  {item.color && <span className="dd-item-sub">{item.color}</span>}
                </td>
                <td>
                  <span className="dd-name">{item.userId?.name || "—"}</span>
                  <span className="dd-item-sub">{item.userId?.email}</span>
                </td>
                <td className="dd-mono">{item.userId?.enrollmentNumber || "—"}</td>
                <td className="dd-muted dd-sm">{item.placeLost}</td>
                <td className="dd-muted dd-sm">{fmtDate(item.dateLost)}</td>
                <td><Pill status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={data?.pagination?.totalPages} />
    </>
  );
}

function FoundItemsPanel() {
  const [page, setPage] = useState(1);
  const [blockFilter, setBlockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleBlockFilter = (val) => { setBlockFilter(val); setPage(1); };
  const handleStatusFilter = (val) => { setStatusFilter(val); setPage(1); };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["director-founditems", page, blockFilter, statusFilter],
    queryFn: () =>
      getDirectorFoundItems({ page, limit: 10, block: blockFilter, status: statusFilter }),
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });

  return (
    <>
      <FilterBar
        blockFilter={blockFilter}
        setBlockFilter={handleBlockFilter}
        statusFilter={statusFilter}
        setStatusFilter={handleStatusFilter}
        statusOptions={FOUND_STATUSES}
      />
      <div className="dd-table-wrap">
        <table className="dd-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Admin (Block)</th>
              <th>Brand</th>
              <th>Place found</th>
              <th>Date found</th>
              <th>Claimed by</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <ShimmerRows cols={7} />}
            {isError && (
              <tr><td colSpan={7} className="dd-error-cell">{error.message}</td></tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr><td colSpan={7} className="dd-empty-cell">No found items found.</td></tr>
            )}
            {data?.data?.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="dd-name">{item.name}</span>
                  {item.color && <span className="dd-item-sub">{item.color}</span>}
                </td>
                <td>
                  <div className="dd-name-cell">
                    <BlockBadge block={item.block} />
                    <span className="dd-sm">{item.adminId?.name || "—"}</span>
                  </div>
                </td>
                <td className="dd-muted">{item.brand || "—"}</td>
                <td className="dd-muted dd-sm">{item.placeFound}</td>
                <td className="dd-muted dd-sm">{fmtDate(item.dateFound)}</td>
                <td>
                  {item.claimedBy ? (
                    <>
                      <span className="dd-name">{item.claimedBy.name}</span>
                      <span className="dd-item-sub">{item.claimedBy.enrollmentNumber}</span>
                    </>
                  ) : (
                    <span className="dd-muted">—</span>
                  )}
                </td>
                <td><Pill status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={data?.pagination?.totalPages} />
    </>
  );
}

// ── Stat grid ──────────────────────────────────────────────────────────────
function StatsGrid({ analytics, isLoading }) {
  if (isLoading) {
    return (
      <div className="dd-stats">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dd-stat">
            <div className="shimmer" style={{ width: 34, height: 34, borderRadius: 8 }} />
            <div className="shimmer shimmer-cell" style={{ width: "55%", marginTop: 10 }} />
            <div className="shimmer shimmer-cell" style={{ width: "35%", marginTop: 6, height: 28 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dd-stats">
      {STAT_CARDS(analytics).map(({ label, value, Icon, mod }) => (
        <div key={label} className="dd-stat">
          <div className={`dd-stat-icon ${mod}`}>
            <Icon size={17} aria-hidden="true" />
          </div>
          <div className="dd-stat-label">{label}</div>
          <div className="dd-stat-value">{value ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function DirectorDashboard() {
  const [activeTab, setActiveTab] = useState("admins");
  const queryClient = useQueryClient();

  const {
    data: analyticsRes,
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ["director-analytics"],
    queryFn: getDirectorAnalytics,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data.analytics,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["director-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["director-admins"] });
    queryClient.invalidateQueries({ queryKey: ["director-students"] });
    queryClient.invalidateQueries({ queryKey: ["director-lostitems"] });
    queryClient.invalidateQueries({ queryKey: ["director-founditems"] });
  };

  return (
    <div className="dd-shell">
      <h1 className="sr-only">AmiFound Director Dashboard</h1>

      {/* Top bar */}
      <div className="dd-topbar">
        <div>
          <div className="dd-topbar-left">
            <span className="dd-title">Director Dashboard</span>
            <span className="dd-badge">AmiFound</span>
          </div>
          <p className="dd-sub">
            Amity University Gwalior — Lost &amp; Found Management
          </p>
        </div>
        <button className="dd-refresh-btn" onClick={handleRefresh} aria-label="Refresh all data">
          <LuRefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Analytics */}
      <StatsGrid analytics={analyticsRes} isLoading={analyticsLoading} />

      {/* Tab bar */}
      <div className="dd-tabs" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`dd-tab${activeTab === id ? " active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="dd-section-head">
        <span className="dd-section-title">
          {TABS.find((t) => t.id === activeTab)?.label}
        </span>
      </div>

      {/* Panels — all mounted, hidden via CSS for instant tab switch */}
      <div style={{ display: activeTab === "admins" ? "block" : "none" }}>
        <AdminsPanel />
      </div>
      <div style={{ display: activeTab === "students" ? "block" : "none" }}>
        <StudentsPanel />
      </div>
      <div style={{ display: activeTab === "lostitems" ? "block" : "none" }}>
        <LostItemsPanel />
      </div>
      <div style={{ display: activeTab === "founditems" ? "block" : "none" }}>
        <FoundItemsPanel />
      </div>
    </div>
  );
}