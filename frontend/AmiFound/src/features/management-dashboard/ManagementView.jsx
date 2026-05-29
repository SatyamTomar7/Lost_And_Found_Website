import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuBuilding2,
  LuChevronLeft,
  LuChevronRight,
  LuFilter,
  LuRefreshCw,
} from "react-icons/lu";
import managementStyles from "./ManagementDashboard.module.css";
import {
  BLOCKS,
  FOUND_STATUSES,
  LOST_STATUSES,
  MGMT_STAT_CARDS,
  MGMT_TABS,
} from "./constants";
import {
  BlockBadge,
  MgmtAvatar,
  Pill,
  ShimmerRows,
} from "./shared-components";
import { fmtDate } from "./helpers";
import {
  getDirectorAdmins,
  getDirectorAnalytics,
  getDirectorFoundItems,
  getDirectorLostItems,
  getDirectorStudents,
} from "./services/managementService";

function MgmtFilterBar({
  blockFilter,
  setBlockFilter,
  statusFilter,
  setStatusFilter,
  statusOptions,
}) {
  return (
    <div className={managementStyles["dd-filter-bar"]}>
      <span className={managementStyles["dd-filter-icon"]}>
        <LuFilter size={14} />
      </span>
      {setBlockFilter && (
        <div className={managementStyles["dd-filter-group"]}>
          <label className={managementStyles["dd-filter-label"]}>Block</label>
          <div className={managementStyles["dd-select-wrap"]}>
            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className={managementStyles["dd-select"]}
              aria-label="Filter by block"
            >
              <option value="">All blocks</option>
              {BLOCKS.map((b) => (
                <option key={b} value={b}>
                  Block {b}
                </option>
              ))}
            </select>
            <LuBuilding2
              className={managementStyles["dd-select-icon"]}
              size={13}
            />
          </div>
        </div>
      )}
      {statusOptions && (
        <div className={managementStyles["dd-filter-group"]}>
          <label className={managementStyles["dd-filter-label"]}>Status</label>
          <div className={managementStyles["dd-select-wrap"]}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={managementStyles["dd-select"]}
              aria-label="Filter by status"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className={managementStyles["dd-filter-chips"]}>
        {blockFilter && setBlockFilter && (
          <button
            className={managementStyles["dd-chip"]}
            onClick={() => setBlockFilter("")}
          >
            Block {blockFilter} x
          </button>
        )}
        {statusFilter && statusOptions && (
          <button
            className={managementStyles["dd-chip"]}
            onClick={() => setStatusFilter("")}
          >
            {statusOptions.find((s) => s.value === statusFilter)?.label} x
          </button>
        )}
      </div>
    </div>
  );
}

function MgmtPagination({ page, setPage, totalPages }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className={managementStyles["dd-pagination"]}>
      <button
        className={managementStyles["dd-page-btn"]}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <LuChevronLeft size={15} />
      </button>
      <span className={managementStyles["dd-page-info"]}>
        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
      </span>
      <button
        className={managementStyles["dd-page-btn"]}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <LuChevronRight size={15} />
      </button>
    </div>
  );
}

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
      <div className={managementStyles["dd-table-wrap"]}>
        <table className={managementStyles["dd-table"]}>
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
              <tr>
                <td colSpan={6} className={managementStyles["dd-error-cell"]}>
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={6} className={managementStyles["dd-empty-cell"]}>
                  No admins found.
                </td>
              </tr>
            )}
            {data?.data?.map((a) => (
              <tr key={a._id}>
                <td data-label="Name">
                  <div className={managementStyles["dd-name-cell"]}>
                    <MgmtAvatar name={a.name} />
                    <span className={managementStyles["dd-name"]}>{a.name}</span>
                  </div>
                </td>
                <td
                  data-label="Email"
                  className={`${managementStyles["dd-muted"]} ${managementStyles["dd-sm"]}`}
                >
                  {a.email}
                </td>
                <td data-label="Role">
                  <Pill status={a.role} />
                </td>
                <td data-label="Block">
                  <BlockBadge block={a.block} />
                </td>
                <td data-label="Status">
                  {a.isActive ? (
                    <span
                      className={`${managementStyles["dd-pill"]} ${managementStyles["pill-returned"]}`}
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className={`${managementStyles["dd-pill"]} ${managementStyles["pill-unclaimed"]}`}
                    >
                      Inactive
                    </span>
                  )}
                </td>
                <td
                  data-label="Last login"
                  className={`${managementStyles["dd-muted"]} ${managementStyles["dd-sm"]}`}
                >
                  {fmtDate(a.lastLogin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MgmtPagination
        page={page}
        setPage={setPage}
        totalPages={data?.pagination?.totalPages}
      />
    </>
  );
}

function StudentsPanel() {
  const [page, setPage] = useState(1);
  const [blockFilter, setBlockFilter] = useState("");
  const handleBlockFilter = (val) => {
    setBlockFilter(val);
    setPage(1);
  };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["director-students", page, blockFilter],
    queryFn: () => getDirectorStudents({ page, limit: 10, block: blockFilter }),
    staleTime: 3 * 60 * 1000,
    select: (res) => res.data,
  });

  return (
    <>
      <MgmtFilterBar
        blockFilter={blockFilter}
        setBlockFilter={handleBlockFilter}
        statusOptions={null}
      />
      <div className={managementStyles["dd-table-wrap"]}>
        <table className={managementStyles["dd-table"]}>
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
              <tr>
                <td colSpan={6} className={managementStyles["dd-error-cell"]}>
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={6} className={managementStyles["dd-empty-cell"]}>
                  No students found.
                </td>
              </tr>
            )}
            {data?.data?.map((s) => (
              <tr key={s._id}>
                <td data-label="Name">
                  <div className={managementStyles["dd-name-cell"]}>
                    <MgmtAvatar name={s.name} />
                    <div>
                      <span className={managementStyles["dd-name"]}>{s.name}</span>
                      <span className={managementStyles["dd-item-sub"]}>{s.email}</span>
                    </div>
                  </div>
                </td>
                <td
                  data-label="Enrollment no."
                  className={managementStyles["dd-mono"]}
                >
                  {s.enrollmentNumber}
                </td>
                <td data-label="Course / Branch">
                  <span className={managementStyles["dd-name"]}>{s.course}</span>
                  <span className={managementStyles["dd-item-sub"]}>{s.branch}</span>
                </td>
                <td data-label="Semester">
                  <span
                    className={`${managementStyles["dd-pill"]} ${managementStyles["pill-found"]}`}
                  >
                    Sem {s.semester}
                  </span>
                </td>
                <td data-label="Block">
                  <BlockBadge block={s.block} />
                </td>
                <td data-label="Section" className={managementStyles["dd-muted"]}>
                  {s.section || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MgmtPagination
        page={page}
        setPage={setPage}
        totalPages={data?.pagination?.totalPages}
      />
    </>
  );
}

function MgmtLostItemsPanel() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["director-lostitems", page, statusFilter],
    queryFn: () =>
      getDirectorLostItems({ page, limit: 10, status: statusFilter }),
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });

  return (
    <>
      <MgmtFilterBar
        statusFilter={statusFilter}
        setStatusFilter={handleStatusFilter}
        statusOptions={LOST_STATUSES}
      />
      <div className={managementStyles["dd-table-wrap"]}>
        <table className={managementStyles["dd-table"]}>
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
              <tr>
                <td colSpan={6} className={managementStyles["dd-error-cell"]}>
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={6} className={managementStyles["dd-empty-cell"]}>
                  No lost items found.
                </td>
              </tr>
            )}
            {data?.data?.map((item) => (
              <tr key={item._id}>
                <td data-label="Item">
                  <span className={managementStyles["dd-name"]}>{item.name}</span>
                  {item.color && (
                    <span className={managementStyles["dd-item-sub"]}>{item.color}</span>
                  )}
                </td>
                <td data-label="Reported by">
                  <span className={managementStyles["dd-name"]}>
                    {item.userId?.name || "-"}
                  </span>
                  <span className={managementStyles["dd-item-sub"]}>
                    {item.userId?.email}
                  </span>
                </td>
                <td
                  data-label="Enrollment"
                  className={managementStyles["dd-mono"]}
                >
                  {item.userId?.enrollmentNumber || "-"}
                </td>
                <td
                  data-label="Place lost"
                  className={`${managementStyles["dd-muted"]} ${managementStyles["dd-sm"]}`}
                >
                  {item.placeLost}
                </td>
                <td
                  data-label="Date lost"
                  className={`${managementStyles["dd-muted"]} ${managementStyles["dd-sm"]}`}
                >
                  {fmtDate(item.dateLost)}
                </td>
                <td data-label="Status">
                  <Pill status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MgmtPagination
        page={page}
        setPage={setPage}
        totalPages={data?.pagination?.totalPages}
      />
    </>
  );
}

function MgmtFoundItemsPanel() {
  const [page, setPage] = useState(1);
  const [blockFilter, setBlockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const handleBlockFilter = (val) => {
    setBlockFilter(val);
    setPage(1);
  };
  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["director-founditems", page, blockFilter, statusFilter],
    queryFn: () =>
      getDirectorFoundItems({
        page,
        limit: 10,
        block: blockFilter,
        status: statusFilter,
      }),
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });

  return (
    <>
      <MgmtFilterBar
        blockFilter={blockFilter}
        setBlockFilter={handleBlockFilter}
        statusFilter={statusFilter}
        setStatusFilter={handleStatusFilter}
        statusOptions={FOUND_STATUSES}
      />
      <div className={managementStyles["dd-table-wrap"]}>
        <table className={managementStyles["dd-table"]}>
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
              <tr>
                <td colSpan={7} className={managementStyles["dd-error-cell"]}>
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={7} className={managementStyles["dd-empty-cell"]}>
                  No found items found.
                </td>
              </tr>
            )}
            {data?.data?.map((item) => (
              <tr key={item._id}>
                <td data-label="Item">
                  <span className={managementStyles["dd-name"]}>{item.name}</span>
                  {item.color && (
                    <span className={managementStyles["dd-item-sub"]}>{item.color}</span>
                  )}
                </td>
                <td data-label="Admin (Block)">
                  <div className={managementStyles["dd-name-cell"]}>
                    <BlockBadge block={item.block} />
                    <span className={managementStyles["dd-sm"]}>
                      {item.createdBy?.name || "-"}
                    </span>
                  </div>
                </td>
                <td data-label="Brand" className={managementStyles["dd-muted"]}>
                  {item.brand || "-"}
                </td>
                <td
                  data-label="Place found"
                  className={`${managementStyles["dd-muted"]} ${managementStyles["dd-sm"]}`}
                >
                  {item.placeFound}
                </td>
                <td
                  data-label="Date found"
                  className={`${managementStyles["dd-muted"]} ${managementStyles["dd-sm"]}`}
                >
                  {fmtDate(item.dateFound)}
                </td>
                <td data-label="Claimed by">
                  {item.claimedBy ? (
                    <>
                      <span className={managementStyles["dd-name"]}>
                        {item.claimedBy.name}
                      </span>
                      <span className={managementStyles["dd-item-sub"]}>
                        {item.claimedBy.enrollmentNumber}
                      </span>
                    </>
                  ) : (
                    <span className={managementStyles["dd-muted"]}>-</span>
                  )}
                </td>
                <td data-label="Status">
                  <Pill status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MgmtPagination
        page={page}
        setPage={setPage}
        totalPages={data?.pagination?.totalPages}
      />
    </>
  );
}

export default function ManagementView({ role, onBackToOps }) {
  const [activeTab, setActiveTab] = useState("admins");
  const queryClient = useQueryClient();

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["director-analytics"],
    queryFn: getDirectorAnalytics,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data.analytics,
  });

  const handleRefresh = () => {
    [
      "director-analytics",
      "director-admins",
      "director-students",
      "director-lostitems",
      "director-founditems",
    ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  return (
    <div className={managementStyles["dd-shell"]}>
      <h1 className="sr-only">AmiFound Management Dashboard</h1>

      <div className={managementStyles["dd-topbar"]}>
        <div>
          <div className={managementStyles["dd-topbar-left"]}>
            <span className={managementStyles["dd-title"]}>
              {role === "director" ? "Director Dashboard" : "Management View"}
            </span>
            <span className={managementStyles["dd-badge"]}>AmiFound</span>
          </div>
          <p className={managementStyles["dd-sub"]}>
            Amity University Gwalior - Lost &amp; Found Management
          </p>
        </div>
        <div className={managementStyles["topbar-actions"]}>
          {role === "security" && onBackToOps && (
            <button
              className={managementStyles["dd-refresh-btn"]}
              onClick={onBackToOps}
              aria-label="Back to operational view"
            >
              Back to Operations
            </button>
          )}
          <button
            className={managementStyles["dd-refresh-btn"]}
            onClick={handleRefresh}
            aria-label="Refresh all data"
          >
            <LuRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {analyticsLoading ? (
        <div className={managementStyles["dd-stats"]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={managementStyles["dd-stat"]}>
              <div
                className={`${managementStyles.shimmer} ${managementStyles["stats-shimmer-icon"]}`}
              />
              <div
                className={`${managementStyles.shimmer} ${managementStyles["shimmer-cell"]} ${managementStyles["stats-shimmer-label"]}`}
              />
              <div
                className={`${managementStyles.shimmer} ${managementStyles["shimmer-cell"]} ${managementStyles["stats-shimmer-value"]}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={managementStyles["dd-stats"]}>
          {MGMT_STAT_CARDS(analytics).map(({ label, value, Icon, mod }) => (
            <div key={label} className={managementStyles["dd-stat"]}>
              <div
                className={`${managementStyles["dd-stat-icon"]} ${managementStyles[mod]}`}
              >
                <Icon size={17} aria-hidden="true" />
              </div>
              <div className={managementStyles["dd-stat-label"]}>{label}</div>
              <div className={managementStyles["dd-stat-value"]}>{value ?? "-"}</div>
            </div>
          ))}
        </div>
      )}

      <div className={managementStyles["dd-tabs"]} role="tablist">
        {MGMT_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`${managementStyles["dd-tab"]}${activeTab === id ? ` ${managementStyles.active}` : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div className={managementStyles["dd-section-head"]}>
        <span className={managementStyles["dd-section-title"]}>
          {MGMT_TABS.find((t) => t.id === activeTab)?.label}
        </span>
      </div>

      {activeTab === "admins" && <AdminsPanel />}
      {activeTab === "students" && <StudentsPanel />}
      {activeTab === "lostitems" && <MgmtLostItemsPanel />}
      {activeTab === "founditems" && <MgmtFoundItemsPanel />}
    </div>
  );
}
