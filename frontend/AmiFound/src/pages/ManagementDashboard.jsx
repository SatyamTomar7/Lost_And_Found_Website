import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── Icons ─────────────────────────────────────────────────────────────────────
import {
  FaPalette,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCheck,
  FaClock,
  FaUser,
  FaEnvelope,
  FaPercentage,
  FaUserShield,
  FaPlusCircle,
  FaPlus,
  FaBox,
  FaSpinner,
  FaInbox,
  FaLink,
  FaTimes,
  FaExchangeAlt,
  FaInfoCircle,
  FaWalking,
  FaExclamationTriangle,
  FaEdit,
  FaCheckCircle,
  FaIdCard,
  FaPhone,
  FaChartBar,
} from "react-icons/fa";
import {
  LuUsers,
  LuShieldCheck,
  LuPackage,
  LuPackageOpen,
  LuLink,
  LuRefreshCw,
  LuFilter,
  LuChevronLeft,
  LuChevronRight,
  LuBuilding2,
} from "react-icons/lu";

// ── Item constants ────────────────────────────────────────────────────────────
import {
  COLORS,
  ITEM_CONDITIONS,
  getLocationsByRole,
  ITEM_NAME,
} from "../utils/itemConstants";

// ── Services ──────────────────────────────────────────────────────────────────
import {
  submitFoundItem,
  getDepartmentFoundItems,
  updateFoundItemStatus,
  getMatchStats,
  getMatchedLostItemsForFoundItem,
  markItemCollectedOffline,
} from "../services/itemService";

import {
  getDirectorAnalytics,
  getDirectorAdmins,
  getDirectorStudents,
  getDirectorLostItems,
  getDirectorFoundItems,
} from "../services/managementService";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Constants
// ─────────────────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

const BLOCKS = ["A", "B", "C", "D", "E"];

const LOST_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "matched", label: "Matched" },
  { value: "collected", label: "Collected" },
  { value: "self resolved", label: "Self resolved" },
];

const FOUND_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "found", label: "Found" },
  { value: "matched", label: "Matched" },
  { value: "returned", label: "Returned" },
  { value: "unclaimed", label: "Unclaimed" },
  { value: "offline returned", label: "Collected offline" },
];

const PILL_CLASS = {
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

const MGMT_STAT_CARDS = (a) => [
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

const OP_QUERY_KEYS = {
  foundItems: ["foundItems"],
  matches: ["matches"],
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const foundItemSchema = z.object({
  name: z.string().min(1, "Please select a name"),
  color: z.string().min(1, "Please select a color"),
  brand: z.string().max(20, "Brand name too long").optional().or(z.literal("")),
  condition: z.enum(["New", "Used"], {
    required_error: "Please select condition",
  }),
  dateFound: z
    .string()
    .min(1, "Date is required")
    .refine((d) => d <= today, { message: "Date cannot be in the future" }),
  placeFound: z.string().min(1, "Please select a location"),
});

const collectOfflineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  enrollmentNumber: z.string().min(1, "Enrollment required"),
  phoneNumber: z.string().min(1, "Phone required"),
  course: z.string().min(1, "Course required"),
  branch: z.string().min(1, "Branch required"),
  semester: z.string().min(1, "Semester required"),
  block: z.string().min(1, "Block required"),
});

const foundItemResolver = zodResolver(foundItemSchema);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Shared micro-components
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState = React.memo(
  ({ icon: IconComponent, title, description, isSpinning }) => (
    <div className="empty-state">
      <IconComponent
        style={isSpinning ? { animation: "fa-spin 2s infinite linear" } : {}}
      />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

// ── Management micro-components ───────────────────────────────────────────────

const MgmtAvatar = ({ name = "" }) => (
  <span className="dd-avatar" aria-hidden="true">
    {name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)}
  </span>
);

const BlockBadge = ({ block }) =>
  block ? (
    <span className="dd-block-badge">{block}</span>
  ) : (
    <span className="dd-muted">—</span>
  );

const Pill = ({ status }) => {
  const key = (status || "").toLowerCase();
  return (
    <span className={`dd-pill ${PILL_CLASS[key] || "pill-pending"}`}>
      {status || "—"}
    </span>
  );
};

const ShimmerRows = ({ cols = 6, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="dd-shimmer-row">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j}>
            <div className="shimmer shimmer-cell" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Operational modals (shared by admin + security)
// ─────────────────────────────────────────────────────────────────────────────

const SubmitConfirmModal = React.memo(
  ({ formData, onConfirm, onEdit, isLoading }) => (
    <div className="return-modal-overlay" role="presentation">
      <div
        className="return-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-submit-title"
      >
        <div className="return-modal__header">
          <div className="return-modal__title-group">
            <FaExclamationTriangle className="return-modal__icon return-modal__icon--warning" />
            <h3 id="confirm-submit-title">Confirm Item Details</h3>
          </div>
        </div>
        <div className="return-details__body">
          <div className="submit-confirm-modal__warning" role="alert">
            <FaExclamationTriangle />
            <p>
              <strong>Once submitted, details cannot be edited.</strong> Please
              verify carefully.
            </p>
          </div>
          <div className="submit-confirm-modal__details">
            {[
              ["Item Name", formData.name],
              ["Color", formData.color],
              ["Condition", formData.condition],
              formData.brand ? ["Brand", formData.brand] : null,
              ["Place Found", formData.placeFound],
              [
                "Date Found",
                new Date(formData.dateFound).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              ],
            ]
              .filter(Boolean)
              .map(([label, value]) => (
                <div key={label} className="submit-confirm-modal__row">
                  <span className="submit-confirm-modal__label">{label}</span>
                  <span className="submit-confirm-modal__value">{value}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="return-modal__footer">
          <button
            className="btn btn--outline"
            onClick={onEdit}
            disabled={isLoading}
          >
            <FaEdit /> Go Back &amp; Edit
          </button>
          <button
            className="btn btn--primary"
            onClick={onCkonfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaSpinner className="spin-icon" /> Adding…
              </>
            ) : (
              <>
                <FaCheckCircle /> Confirm &amp; Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ),
);
SubmitConfirmModal.displayName = "SubmitConfirmModal";

const ReturnDetailsModal = ({ item, onClose }) => (
  <div className="return-modal-overlay" onClick={onClose}>
    <div
      className="return-modal"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
    >
      <div className="return-modal__header">
        <div className="return-modal__title-group">
          <FaInfoCircle className="return-modal__icon" />
          <h3 id="details-modal-title">Return Details</h3>
        </div>
        <button
          className="return-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <FaTimes />
        </button>
      </div>
      <div className="return-details__body">
        <div className="return-details__section">
          <p className="return-details__section-label">Returned Item</p>
          <div className="return-details__item-card">
            <div className="return-details__item-name">{item.name}</div>
            <div className="item-meta">
              <span>
                <FaPalette /> {item.color}
              </span>
              <span>
                <FaMapMarkerAlt /> {item.placeFound}
              </span>
              <span>
                <FaCalendarAlt />{" "}
                {new Date(item.dateFound).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="return-details__section">
          <p className="return-details__section-label">Claimed By</p>
          <div className="return-details__claimant-grid">
            {[
              [FaUser, "Name", item.claimedBy?.name],
              [FaEnvelope, "Email", item.claimedBy?.email],
              [FaIdCard, "Enrollment No.", item.claimedBy?.enrollmentNumber],
              [FaPhone, "Mobile", item.claimedBy?.phoneNumber],
              [FaBox, "Course", item.claimedBy?.course],
              [FaLink, "Branch", item.claimedBy?.branch],
              [FaClock, "Semester", item.claimedBy?.semester],
              [FaMapMarkerAlt, "Block", item.claimedBy?.block],
            ].map(([Icon, label, val]) => (
              <div key={label} className="return-details__claimant-row">
                <span className="return-details__claimant-icon">
                  <Icon />
                </span>
                <span className="return-details__claimant-field">{label}</span>
                <span className="return-details__claimant-val">
                  {val || "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>
        {item.returnedAt && (
          <div className="return-details__section">
            <p className="return-details__section-label">Returned On</p>
            <div className="return-details__date">
              <FaCalendarAlt />
              <span>
                {new Date(item.returnedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="return-modal__footer">
        <button className="btn btn--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </div>
);

const CollectOfflineModal = ({ item, onConfirm, onClose, isLoading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(collectOfflineSchema),
    defaultValues: {
      name: "",
      email: "",
      enrollmentNumber: "",
      phoneNumber: "",
      course: "",
      branch: "",
      semester: "",
      block: "",
    },
  });
  return (
    <div className="return-modal-overlay" onClick={onClose}>
      <div
        className="return-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collect-offline-title"
      >
        <div className="return-modal__header">
          <div className="return-modal__title-group">
            <FaWalking className="return-modal__icon" />
            <h3 id="collect-offline-title">Collected Offline</h3>
          </div>
          <button
            className="return-modal__close"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>
        <div className="return-modal__found-summary">
          <p className="return-modal__label">Item being marked as collected:</p>
          <p className="return-modal__item-name">
            <strong>{item.name}</strong> — {item.color} • {item.placeFound}
          </p>
        </div>
        <form onSubmit={handleSubmit((d) => onConfirm(item._id, d))} noValidate>
          <div
            className="return-modal__body"
            style={{
              paddingBottom: 0,
              maxHeight: "55vh",
              overflowY: "auto",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              Record who collected this item in person so it can be referenced
              later.
            </p>
            {[
              ["name", "Name", FaUser, "Full Name"],
              ["email", "Email", FaEnvelope, "example@gmail.com"],
              [
                "enrollmentNumber",
                "Enrollment Number",
                FaIdCard,
                "A2305214118",
              ],
              ["phoneNumber", "Phone Number", FaPhone, "9876543210"],
              ["course", "Course", FaBox, "B.Tech"],
              ["branch", "Branch", FaLink, "CSE"],
              ["semester", "Semester", FaClock, "6"],
              ["block", "Block", FaMapMarkerAlt, "A"],
            ].map(([field, label, Icon, placeholder]) => (
              <div className="form-group" key={field}>
                <label className="form-label">{label} *</label>

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Icon
                    style={{
                      position: "absolute",
                      left: "12px",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      pointerEvents: "none",
                    }}
                  />

                  <input
                    {...register(field)}
                    className={`form-control ${
                      errors[field] ? "is-invalid" : ""
                    }`}
                    placeholder={placeholder}
                    disabled={isLoading}
                    style={{ paddingLeft: "34px" }}
                  />
                </div>

                {errors[field] && (
                  <div className="error-message">{errors[field]?.message}</div>
                )}
              </div>
            ))}
          </div>
          <div className="return-modal__footer">
            <button
              type="button"
              className="btn btn--outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--collected-offline"
              disabled={isLoading}
              style={{
                background: isLoading ? undefined : "#b45309",
                color: "#fff",
                border: "none",
              }}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="spin-icon" /> Saving…
                </>
              ) : (
                <>
                  <FaWalking /> Confirm Offline Collection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
CollectOfflineModal.displayName = "CollectOfflineModal";

const OfflineCollectedDetailsModal = ({ item, onClose }) => (
  <div className="return-modal-overlay" onClick={onClose}>
    <div
      className="return-modal"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-modal-title"
    >
      <div className="return-modal__header">
        <div className="return-modal__title-group">
          <FaWalking className="return-modal__icon" />
          <h3 id="offline-modal-title">Collected Offline</h3>
        </div>

        <button
          className="return-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <FaTimes />
        </button>
      </div>

      <div className="return-details__body">
        {/* Item Details */}
        <div className="return-details__section">
          <p className="return-details__section-label">Item</p>

          <div className="return-details__item-card">
            <div className="return-details__item-name">{item.name}</div>

            <div className="item-meta">
              <span>
                <FaPalette /> {item.color}
              </span>

              <span>
                <FaMapMarkerAlt /> {item.placeFound}
              </span>

              <span>
                <FaCalendarAlt />{" "}
                {new Date(item.dateFound).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Student Details */}
        <div className="return-details__section">
          <p className="return-details__section-label">Collected By</p>

          <div className="return-details__claimant-grid">
            {[
              [FaUser, "Name", item.claimedBy?.name],
              [FaEnvelope, "Email", item.claimedBy?.email],
              [FaIdCard, "Enrollment No.", item.claimedBy?.enrollmentNumber],
              [FaPhone, "Mobile", item.claimedBy?.phoneNumber],
              [FaBox, "Course", item.claimedBy?.course],
              [FaLink, "Branch", item.claimedBy?.branch],
              [FaClock, "Semester", item.claimedBy?.semester],
              [FaMapMarkerAlt, "Block", item.claimedBy?.block],
            ].map(([Icon, label, value]) => (
              <div key={label} className="return-details__claimant-row">
                <span className="return-details__claimant-icon">
                  <Icon />
                </span>

                <span className="return-details__claimant-field">{label}</span>

                <span className="return-details__claimant-val">
                  {value || "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Collection Date */}
        {item.returnedAt && (
          <div className="return-details__section">
            <p className="return-details__section-label">Collected On</p>

            <div className="return-details__date">
              <FaCalendarAlt />

              <span>
                {new Date(item.returnedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="return-modal__footer">
        <button className="btn btn--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </div>
);

const ReturnModal = ({ foundItem, onConfirm, onClose, isLoading }) => {
  const [selectedLostItem, setSelectedLostItem] = useState(null);
  const {
    data: matchedLostItems = [],
    isLoading: loadingMatches,
    isError,
  } = useQuery({
    queryKey: ["matchedLostItems", foundItem._id],
    queryFn: async () => {
      const r = await getMatchedLostItemsForFoundItem(foundItem._id);
      return r.data.data || [];
    },
    staleTime: 0,
  });
  return (
    <div className="return-modal-overlay" onClick={onClose}>
      <div
        className="return-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-modal-title"
      >
        <div className="return-modal__header">
          <div className="return-modal__title-group">
            <FaExchangeAlt className="return-modal__icon" />
            <h3 id="return-modal-title">Return Item</h3>
          </div>
          <button
            className="return-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        <div className="return-modal__found-summary">
          <p className="return-modal__label">Returning found item:</p>
          <p className="return-modal__item-name">
            <strong>{foundItem.name}</strong> — {foundItem.color} •{" "}
            {foundItem.placeFound}
          </p>
        </div>
        <div className="return-modal__body">
          <p className="return-modal__instruction">
            Select the claimant's lost item report:
          </p>
          {loadingMatches ? (
            <div className="return-modal__loading">
              <FaSpinner className="spin-icon" />
              <span>Loading matched items…</span>
            </div>
          ) : isError ? (
            <div className="return-modal__error">
              Failed to load matched items. Please try again.
            </div>
          ) : matchedLostItems.length === 0 ? (
            <div className="return-modal__empty">
              <FaInbox />
              <p>No matched lost items found for this item.</p>
            </div>
          ) : (
            <ul className="return-modal__list" role="listbox">
              {matchedLostItems.map((lostItem) => (
                <li
                  key={lostItem._id}
                  role="option"
                  aria-selected={selectedLostItem?._id === lostItem._id}
                  className={`return-modal__list-item ${selectedLostItem?._id === lostItem._id ? "return-modal__list-item--selected" : ""}`}
                  onClick={() => setSelectedLostItem(lostItem)}
                >
                  <div className="return-modal__list-item-check">
                    {selectedLostItem?._id === lostItem._id && <FaCheck />}
                  </div>
                  <div className="return-modal__list-item-info">
                    <div className="return-modal__list-item-name">
                      {lostItem.name}
                    </div>
                    <div className="return-modal__list-item-meta">
                      <span>
                        <FaPalette /> {lostItem.color}
                      </span>
                      <span>
                        <FaMapMarkerAlt /> {lostItem.placeLost}
                      </span>
                      <span>
                        <FaCalendarAlt />{" "}
                        {new Date(lostItem.dateLost).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="return-modal__list-item-user">
                      <div>
                        <FaUser /> {lostItem.userId?.name || "Unknown"}
                      </div>
                      {lostItem.userId?.email && (
                        <div>
                          <FaEnvelope /> {lostItem.userId.email}
                        </div>
                      )}
                      {lostItem.userId?.enrollmentNumber && (
                        <div>
                          <FaIdCard /> {lostItem.userId.enrollmentNumber}
                        </div>
                      )}
                      {lostItem.userId?.semester && (
                        <div>
                          <FaClock /> Semester {lostItem.userId.semester}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="return-modal__footer">
          <button
            className="btn btn--outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={() =>
              selectedLostItem && onConfirm(foundItem._id, selectedLostItem)
            }
            disabled={!selectedLostItem || isLoading || loadingMatches}
          >
            {isLoading ? (
              <>
                <FaSpinner className="spin-icon" /> Processing…
              </>
            ) : (
              <>
                <FaCheck /> Confirm Return
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Operational panels (Add Found / Found Items / Matches)
//             Used by: admin, security (operational mode)
// ─────────────────────────────────────────────────────────────────────────────

const SingleMatchCard = React.memo(({ match }) => {
  const [showImg, setShowImg] = useState(false);
  const lostImage = match.lostItem?.images?.[0];
  return (
    <div className="item-card match-card--single">
      <div className="match-card__header">
        <span className="match-card__badge match-card__badge--single">
          <FaLink /> 1 Match Found
        </span>
        <span className="match-card__similarity">
          <FaPercentage />
          {(match.similarity ?? 0).toFixed(0)}% match
        </span>
      </div>
      <div className="match-card__grid">
        <div className="match-card__side match-card__side--found">
          <p className="match-card__side-label">Found Item</p>
          <h4 className="match-card__item-name">{match.foundItem.name}</h4>
          <div className="item-meta">
            <span>
              <FaPalette /> {match.foundItem.color}
            </span>
            <span>
              <FaMapMarkerAlt /> {match.foundItem.placeFound}
            </span>
            <span>
              <FaCalendarAlt />{" "}
              {new Date(match.foundItem.dateFound).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="match-card__connector">
          <FaExchangeAlt />
        </div>
        <div className="match-card__side match-card__side--lost">
          <p className="match-card__side-label">Lost Item</p>
          <h4 className="match-card__item-name">{match.lostItem.name}</h4>
          <div className="item-meta">
            <span>
              <FaPalette /> {match.lostItem.color}
            </span>
            <span>
              <FaMapMarkerAlt /> {match.lostItem.placeLost}
            </span>
            <span>
              <FaCalendarAlt />{" "}
              {new Date(match.lostItem.dateLost).toLocaleDateString()}
            </span>
          </div>
          {lostImage && (
            <div style={{ marginTop: "8px" }}>
              <button
                className="btn btn--sm btn--outline"
                onClick={() => setShowImg((p) => !p)}
              >
                {showImg ? "Hide Image" : "View Image"}
              </button>
              {showImg && (
                <img
                  src={lostImage.url}
                  alt="Lost item"
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    maxWidth: "200px",
                    borderRadius: "8px",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <div className="match-card__claimant">
        <FaUser />
        <span className="match-card__claimant-name">
          {match.user?.name ?? "Unknown"}
        </span>
        <span className="match-card__claimant-sep">·</span>
        <FaEnvelope />
        <span className="match-card__claimant-email">{match.user?.email}</span>
      </div>
    </div>
  );
});
SingleMatchCard.displayName = "SingleMatchCard";

const MultiMatchSummaryCard = React.memo(
  ({ itemName, matchCount, matches }) => {
    const [expanded, setExpanded] = useState(false);
    return (
      <div className="item-card match-card--multi">
        <div className="match-card__header">
          <div className="match-card__title-group">
            <FaBox className="match-card__item-icon" />
            <span className="match-card__item-title">{itemName}</span>
          </div>
          <span className="match-card__badge match-card__badge--multi">
            <FaLink /> {matchCount} Matches
          </span>
        </div>
        <div className="match-card__meta-row">
          <span className="match-card__dept">
            <FaMapMarkerAlt /> {matches[0]?.foundItem?.block}
          </span>
          <span className="match-card__avg-sim">
            Avg similarity:{" "}
            <strong>
              {(
                matches.reduce((s, m) => s + (m.similarity ?? 0), 0) /
                matchCount
              ).toFixed(0)}
              %
            </strong>
          </span>
        </div>
        <button
          className="match-card__toggle"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide details" : "Show all matches"}
          <span
            className={`match-card__chevron ${expanded ? "match-card__chevron--up" : ""}`}
          >
            ▾
          </span>
        </button>
        {expanded && (
          <ul className="match-card__expanded-list">
            {matches.map((match, idx) => {
              const lostImage = match.lostItem?.images?.[0];
              return (
                <li
                  key={match.lostItem.id}
                  className="match-card__expanded-item"
                >
                  <div className="match-card__expanded-rank">#{idx + 1}</div>
                  <div className="match-card__expanded-info">
                    <div className="match-card__expanded-name">
                      {match.lostItem.name}
                      <span className="match-card__expanded-sim">
                        {(match.similarity ?? 0).toFixed(0)}% match
                      </span>
                    </div>
                    <div className="item-meta">
                      <span>
                        <FaPalette /> {match.lostItem.color}
                      </span>
                      <span>
                        <FaMapMarkerAlt /> {match.lostItem.placeLost}
                      </span>
                    </div>
                    <div className="match-card__expanded-user">
                      <FaUser /> {match.user?.name ?? "Unknown"} ·{" "}
                      <FaEnvelope /> {match.user?.email ?? "No Email"}
                    </div>
                    {lostImage && (
                      <a
                        href={lostImage.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn--sm btn--outline"
                        style={{ marginTop: "6px", display: "inline-block" }}
                      >
                        View Image
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);
MultiMatchSummaryCard.displayName = "MultiMatchSummaryCard";

const FoundItemCard = React.memo(
  ({
    item,
    currentUser,
    onMarkReturned,
    onUpdateStatus,
    onMarkCollectedOffline,
    isUpdating,
    onViewDetails,
    onViewOfflineDetails,
  }) => {
    const statusLower = item.status.toLowerCase();
    const statusClass = statusLower.replace(/\s+/g, "-");
    return (
      <div className="item-card">
        <div className="item-header">
          <div className="item-info">
            <h4>{item.name}</h4>
            <div className="item-meta">
              <span>
                <FaPalette /> {item.color}
              </span>
              <span>
                <FaCalendarAlt />{" "}
                {new Date(item.dateFound).toLocaleDateString()}
              </span>
              <span>
                <FaMapMarkerAlt /> {item.placeFound}
              </span>
            </div>
            {(statusLower === "found" || statusLower === "matched") &&
              item.matchedLostItemIds?.length > 0 && (
                <div className="item-match-badge">
                  <FaLink /> {item.matchedLostItemIds.length} match
                  {item.matchedLostItemIds.length > 1 ? "es" : ""} found
                </div>
              )}
          </div>
          <span className={`status status--${statusClass}`}>{item.status}</span>
        </div>
        <div className="item-actions">
          {statusLower === "returned" && (
            <button
              className="btn btn--sm btn--info"
              onClick={() => onViewDetails(item)}
            >
              <FaInfoCircle /> View Details
            </button>
          )}
          {statusLower === "offline returned" && (
            <button
              className="btn btn--sm btn--info"
              onClick={() => onViewOfflineDetails(item)}
            >
              <FaInfoCircle /> View Details
            </button>
          )}
          {(statusLower === "found" || statusLower === "matched") && (
            <>
              <button
                className="btn btn--sm btn--secondary"
                onClick={() => onMarkReturned(item)}
                disabled={isUpdating}
              >
                <FaCheck /> Mark as Returned
              </button>
              {currentUser?.role === "security" && (
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => onUpdateStatus(item._id, "Unclaimed")}
                  disabled={isUpdating}
                >
                  <FaClock /> Mark as Unclaimed
                </button>
              )}
              <button
                className="btn btn--sm btn--collected-offline"
                onClick={() => onMarkCollectedOffline(item)}
                disabled={isUpdating}
                title="Student collected in person"
              >
                <FaWalking /> Collected Offline
              </button>
            </>
          )}
        </div>
      </div>
    );
  },
);
FoundItemCard.displayName = "FoundItemCard";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — Management panels (Admins / Students / Lost Items / Found Items)
//             Used by: director, security (management mode)
// ─────────────────────────────────────────────────────────────────────────────

function MgmtFilterBar({
  blockFilter,
  setBlockFilter,
  statusFilter,
  setStatusFilter,
  statusOptions,
}) {
  return (
    <div className="dd-filter-bar">
      <span className="dd-filter-icon">
        <LuFilter size={14} />
      </span>
      {setBlockFilter && (
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
                <option key={b} value={b}>
                  Block {b}
                </option>
              ))}
            </select>
            <LuBuilding2 className="dd-select-icon" size={13} />
          </div>
        </div>
      )}
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
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="dd-filter-chips">
        {blockFilter && setBlockFilter && (
          <button className="dd-chip" onClick={() => setBlockFilter("")}>
            Block {blockFilter} ×
          </button>
        )}
        {statusFilter && statusOptions && (
          <button className="dd-chip" onClick={() => setStatusFilter("")}>
            {statusOptions.find((s) => s.value === statusFilter)?.label} ×
          </button>
        )}
      </div>
    </div>
  );
}

function MgmtPagination({ page, setPage, totalPages }) {
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
              <tr>
                <td colSpan={6} className="dd-error-cell">
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={6} className="dd-empty-cell">
                  No admins found.
                </td>
              </tr>
            )}
            {data?.data?.map((a) => (
              <tr key={a._id}>
                <td>
                  <div className="dd-name-cell">
                    <MgmtAvatar name={a.name} />
                    <span className="dd-name">{a.name}</span>
                  </div>
                </td>
                <td className="dd-muted dd-sm">{a.email}</td>
                <td>
                  <Pill status={a.role} />
                </td>
                <td>
                  <BlockBadge block={a.block} />
                </td>
                <td>
                  {a.isActive ? (
                    <span className="dd-pill pill-returned">Active</span>
                  ) : (
                    <span className="dd-pill pill-unclaimed">Inactive</span>
                  )}
                </td>
                <td className="dd-muted dd-sm">{fmtDate(a.lastLogin)}</td>
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
              <tr>
                <td colSpan={6} className="dd-error-cell">
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={6} className="dd-empty-cell">
                  No students found.
                </td>
              </tr>
            )}
            {data?.data?.map((s) => (
              <tr key={s._id}>
                <td>
                  <div className="dd-name-cell">
                    <MgmtAvatar name={s.name} />
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
                <td>
                  <span className="dd-pill pill-found">Sem {s.semester}</span>
                </td>
                <td>
                  <BlockBadge block={s.block} />
                </td>
                <td className="dd-muted">{s.section || "—"}</td>
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
  // const [blockFilter, setBlockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // const handleBlockFilter = (val) => { setBlockFilter(val); setPage(1); };
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
              <tr>
                <td colSpan={6} className="dd-error-cell">
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={6} className="dd-empty-cell">
                  No lost items found.
                </td>
              </tr>
            )}
            {data?.data?.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="dd-name">{item.name}</span>
                  {item.color && (
                    <span className="dd-item-sub">{item.color}</span>
                  )}
                </td>
                <td>
                  <span className="dd-name">{item.userId?.name || "—"}</span>
                  <span className="dd-item-sub">{item.userId?.email}</span>
                </td>
                <td className="dd-mono">
                  {item.userId?.enrollmentNumber || "—"}
                </td>
                <td className="dd-muted dd-sm">{item.placeLost}</td>
                <td className="dd-muted dd-sm">{fmtDate(item.dateLost)}</td>
                <td>
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
              <tr>
                <td colSpan={7} className="dd-error-cell">
                  {error.message}
                </td>
              </tr>
            )}
            {!isLoading && !isError && !data?.data?.length && (
              <tr>
                <td colSpan={7} className="dd-empty-cell">
                  No found items found.
                </td>
              </tr>
            )}
            {data?.data?.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="dd-name">{item.name}</span>
                  {item.color && (
                    <span className="dd-item-sub">{item.color}</span>
                  )}
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
                      <span className="dd-item-sub">
                        {item.claimedBy.enrollmentNumber}
                      </span>
                    </>
                  ) : (
                    <span className="dd-muted">—</span>
                  )}
                </td>
                <td>
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

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — Management view (director / security management mode)
// ─────────────────────────────────────────────────────────────────────────────

const MGMT_TABS = [
  { id: "admins", label: "Admins", Icon: LuShieldCheck },
  { id: "students", label: "Students", Icon: LuUsers },
  { id: "lostitems", label: "Lost Items", Icon: LuPackage },
  { id: "founditems", label: "Found Items", Icon: LuPackageOpen },
];

function ManagementView({ role, onBackToOps }) {
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
    <div className="dd-shell">
      <h1 className="sr-only">AmiFound Management Dashboard</h1>

      {/* Top bar */}
      <div className="dd-topbar">
        <div>
          <div className="dd-topbar-left">
            <span className="dd-title">
              {role === "director" ? "Director Dashboard" : "Management View"}
            </span>
            <span className="dd-badge">AmiFound</span>
          </div>
          <p className="dd-sub">
            Amity University Gwalior — Lost &amp; Found Management
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Security: back to operational view */}
          {role === "security" && onBackToOps && (
            <button
              className="dd-refresh-btn"
              onClick={onBackToOps}
              aria-label="Back to operational view"
            >
              ← Back to Operations
            </button>
          )}
          <button
            className="dd-refresh-btn"
            onClick={handleRefresh}
            aria-label="Refresh all data"
          >
            <LuRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Analytics stat cards */}
      {analyticsLoading ? (
        <div className="dd-stats">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dd-stat">
              <div
                className="shimmer"
                style={{ width: 34, height: 34, borderRadius: 8 }}
              />
              <div
                className="shimmer shimmer-cell"
                style={{ width: "55%", marginTop: 10 }}
              />
              <div
                className="shimmer shimmer-cell"
                style={{ width: "35%", marginTop: 6, height: 28 }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="dd-stats">
          {MGMT_STAT_CARDS(analytics).map(({ label, value, Icon, mod }) => (
            <div key={label} className="dd-stat">
              <div className={`dd-stat-icon ${mod}`}>
                <Icon size={17} aria-hidden="true" />
              </div>
              <div className="dd-stat-label">{label}</div>
              <div className="dd-stat-value">{value ?? "—"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="dd-tabs" role="tablist">
        {MGMT_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`dd-tab${activeTab === id ? " active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div className="dd-section-head">
        <span className="dd-section-title">
          {MGMT_TABS.find((t) => t.id === activeTab)?.label}
        </span>
      </div>

      <div style={{ display: activeTab === "admins" ? "block" : "none" }}>
        <AdminsPanel />
      </div>
      <div style={{ display: activeTab === "students" ? "block" : "none" }}>
        <StudentsPanel />
      </div>
      <div style={{ display: activeTab === "lostitems" ? "block" : "none" }}>
        <MgmtLostItemsPanel />
      </div>
      <div style={{ display: activeTab === "founditems" ? "block" : "none" }}>
        <MgmtFoundItemsPanel />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — Operational view (admin / security operational mode)
// ─────────────────────────────────────────────────────────────────────────────

function OperationalView({
  currentUser,
  setLoading,
  showMessage,
  onViewDashboard,
}) {
  const role = currentUser.role;
  const [activeTab, setActiveTab] = useState("add-found");
  const [returnModalItem, setReturnModalItem] = useState(null);
  const [detailsModalItem, setDetailsModalItem] = useState(null);
  const [offlineDetailsModalItem, setOfflineDetailsModalItem] = useState(null);
  const [collectOfflineItem, setCollectOfflineItem] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: foundItemResolver,
    defaultValues: {
      name: "",
      color: "",
      dateFound: "",
      placeFound: "",
      brand: "",
      condition: "Used",
    },
  });

  // Queries
  const { data: foundItems = [], isLoading: foundItemsLoading } = useQuery({
    queryKey: OP_QUERY_KEYS.foundItems,
    queryFn: async () => {
      const r = await getDepartmentFoundItems();
      return r.data.data || [];
    },
    enabled: activeTab === "found-items",
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: OP_QUERY_KEYS.matches,
    queryFn: async () => {
      const r = await getMatchStats();
      return r.data?.matches || [];
    },
    enabled: activeTab === "matches",
    staleTime: 0,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  // Mutations
  const submitMutation = useMutation({
    mutationFn: (data) => submitFoundItem(data),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success) {
        showMessage("Found item added successfully.", "success");
        reset();
        setPendingFormData(null);
        queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.foundItems });
        queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.matches });
        setActiveTab("matches");
      } else {
        setPendingFormData(null);
        showMessage(result.message || "Failed to add found item.", "error");
      }
    },
    onError: (error) => {
      setPendingFormData(null);
      showMessage(error?.message || "Failed to add found item.", "error");
    },
    onSettled: () => setLoading(false),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, newStatus, lostItemId, claimedByUserId }) =>
      updateFoundItemStatus(itemId, newStatus, lostItemId, claimedByUserId),
    onMutate: async ({ itemId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: OP_QUERY_KEYS.foundItems });
      const prev = queryClient.getQueryData(OP_QUERY_KEYS.foundItems);
      queryClient.setQueryData(OP_QUERY_KEYS.foundItems, (old = []) =>
        old.map((item) =>
          item._id === itemId ? { ...item, status: newStatus } : item,
        ),
      );
      setLoading(true);
      return { previousFoundItems: prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.foundItems });
      queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.matches });
      setReturnModalItem(null);
      showMessage("Item status updated successfully.", "success");
    },
    onError: (error, _vars, context) => {
      if (context?.previousFoundItems)
        queryClient.setQueryData(
          OP_QUERY_KEYS.foundItems,
          context.previousFoundItems,
        );
      showMessage(error?.message || "Failed to update item status.", "error");
    },
    onSettled: () => setLoading(false),
  });

  const collectedOfflineMutation = useMutation({
    mutationFn: ({ itemId, claimedBy }) =>
      markItemCollectedOffline(itemId, claimedBy),

    onMutate: async ({ itemId, claimedBy }) => {
      await queryClient.cancelQueries({
        queryKey: OP_QUERY_KEYS.foundItems,
      });

      const prev = queryClient.getQueryData(OP_QUERY_KEYS.foundItems);

      queryClient.setQueryData(OP_QUERY_KEYS.foundItems, (old = []) =>
        old.map((item) =>
          item._id === itemId
            ? {
                ...item,
                status: "offline returned",
                matchedLostItemIds: [],
                claimedBy,
              }
            : item,
        ),
      );

      setLoading(true);

      return {
        previousFoundItems: prev,
      };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: OP_QUERY_KEYS.foundItems,
      });

      queryClient.invalidateQueries({
        queryKey: OP_QUERY_KEYS.matches,
      });

      setCollectOfflineItem(null);

      showMessage("Item marked as collected offline.", "success");
    },

    onError: (error, _vars, context) => {
      if (context?.previousFoundItems) {
        queryClient.setQueryData(
          OP_QUERY_KEYS.foundItems,
          context.previousFoundItems,
        );
      }

      showMessage(
        error?.message || "Failed to mark item as collected offline.",
        "error",
      );
    },

    onSettled: () => setLoading(false),
  });

  // Callbacks
  const handleUpdateStatus = useCallback(
    (itemId, newStatus) => updateStatusMutation.mutate({ itemId, newStatus }),
    [updateStatusMutation],
  );
  const handleMarkReturned = useCallback(
    (item) => setReturnModalItem(item),
    [],
  );
  const handleReturnConfirm = useCallback(
    (foundItemId, selectedLostItem) => {
      updateStatusMutation.mutate({
        itemId: foundItemId,
        newStatus: "Returned",
        lostItemId: selectedLostItem._id,
        claimedByUserId:
          selectedLostItem.userId?._id || selectedLostItem.userId,
      });
    },
    [updateStatusMutation],
  );
  const handleViewDetails = useCallback(
    (item) => setDetailsModalItem(item),
    [],
  );
  const handleMarkOffline = useCallback(
    (item) => setCollectOfflineItem(item),
    [],
  );
  const handleOfflineConfirm = useCallback(
    (itemId, claimedBy) =>
      collectedOfflineMutation.mutate({
        itemId,
        claimedBy,
      }),
    [collectedOfflineMutation],
  );
  const handleViewOffline = useCallback(
    (item) => setOfflineDetailsModalItem(item),
    [],
  );
  const handleFormSubmit = useCallback((data) => setPendingFormData(data), []);
  const handleConfirmSubmit = useCallback(() => {
    if (pendingFormData) submitMutation.mutate(pendingFormData);
  }, [pendingFormData, submitMutation]);
  const handleEditBack = useCallback(() => setPendingFormData(null), []);

  const groupedMatches = useMemo(
    () =>
      matches.reduce((acc, match) => {
        const key = match.foundItem.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(match);
        return acc;
      }, {}),
    [matches],
  );

  const isAnyUpdating =
    updateStatusMutation.isPending ||
    collectedOfflineMutation.isPending ||
    submitMutation.isPending;
  const isFormDisabled = isSubmitting || submitMutation.isPending;
  const isTabLoading =
    (activeTab === "found-items" && foundItemsLoading) ||
    (activeTab === "matches" && matchesLoading);

  return (
    <div className="page active">
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="user-info">
            <div className="user-avatar">
              <FaUserShield />
            </div>
            <div className="user-details">
              <h3>
                {currentUser?.block || "—"} Block{" "}
                {role === "security" ? "Security" : "Admin"}
              </h3>
            </div>
          </div>
          {/* Security: button to open management view */}
          {role === "security" && onViewDashboard && (
            <button
              className="btn btn--outline btn--sm"
              onClick={onViewDashboard}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaChartBar /> View Dashboard
            </button>
          )}
        </header>

        {/* Nav */}
        <nav className="dashboard-nav" role="tablist">
          {["add-found", "found-items", "matches"].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`nav-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace("-", " ").toUpperCase()}
            </button>
          ))}
        </nav>

        <main className="dashboard-content-area">
          {/* Add Found */}
          {activeTab === "add-found" && (
            <section className="dashboard-tab active" role="tabpanel">
              <div className="tab-content">
                <h2>
                  <FaPlusCircle /> Add Found Item
                </h2>
                <form
                  onSubmit={handleSubmit(handleFormSubmit)}
                  className="dashboard-form"
                >
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="itemname" className="form-label">
                        Item Name *
                      </label>
                      <select
                        id="itemname"
                        {...register("name")}
                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value="">Select Name</option>
                        {ITEM_NAME.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      {errors.name && (
                        <div className="error-message">
                          {errors.name.message}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="itemColor" className="form-label">
                        Color *
                      </label>
                      <select
                        id="itemColor"
                        {...register("color")}
                        className={`form-control ${errors.color ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value="">Select a color</option>
                        {COLORS.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                      {errors.color && (
                        <div className="error-message" role="alert">
                          {errors.color.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Item Condition *</label>
                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          marginTop: "10px",
                          alignItems: "center",
                        }}
                      >
                        {[ITEM_CONDITIONS.NEW, ITEM_CONDITIONS.USED].map(
                          (val) => (
                            <label
                              key={val}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                              }}
                            >
                              <input
                                type="radio"
                                value={val}
                                {...register("condition")}
                                disabled={isFormDisabled}
                                style={{ width: "16px", height: "16px" }}
                              />
                              {val}
                            </label>
                          ),
                        )}
                      </div>
                      {errors.condition && (
                        <div
                          className="error-message"
                          style={{ marginTop: "5px" }}
                        >
                          {errors.condition.message}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="brand" className="form-label">
                        Brand (optional)
                      </label>
                      <input
                        id="brand"
                        {...register("brand")}
                        className="form-control"
                        disabled={isFormDisabled}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="placeFound" className="form-label">
                        Place Found *
                      </label>
                      <select
                        id="placeFound"
                        {...register("placeFound")}
                        className={`form-control ${errors.placeFound ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value="">Select Location</option>
                        {getLocationsByRole(
                          currentUser.role,
                          currentUser.block,
                        ).map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                      {errors.placeFound && (
                        <div className="error-message">
                          {errors.placeFound.message}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="dateFound" className="form-label">
                        Date Found *
                      </label>
                      <input
                        id="dateFound"
                        type="date"
                        max={today}
                        {...register("dateFound")}
                        className={`form-control ${errors.dateFound ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.dateFound && (
                        <div className="error-message">
                          {errors.dateFound.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn--primary btn--full-width"
                    disabled={isFormDisabled}
                  >
                    <FaPlus />{" "}
                    {submitMutation.isPending ? "Adding…" : "Add Found Item"}
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* Found Items */}
          {activeTab === "found-items" && (
            <section className="dashboard-tab active" role="tabpanel">
              <div className="tab-content">
                <h2>
                  <FaBox /> Department Found Items
                </h2>
                <div className="items-list">
                  {isTabLoading ? (
                    <EmptyState
                      icon={FaSpinner}
                      title=""
                      description="Loading..."
                      isSpinning
                    />
                  ) : foundItems.length === 0 ? (
                    <EmptyState
                      icon={FaInbox}
                      title="No Found Items"
                      description="No items found yet."
                    />
                  ) : (
                    foundItems.map((item) => (
                      <FoundItemCard
                        key={item._id}
                        item={item}
                        currentUser={currentUser}
                        onMarkReturned={handleMarkReturned}
                        onUpdateStatus={handleUpdateStatus}
                        onMarkCollectedOffline={handleMarkOffline}
                        isUpdating={isAnyUpdating}
                        onViewDetails={handleViewDetails}
                        onViewOfflineDetails={handleViewOffline}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Matches */}
          {activeTab === "matches" && (
            <section className="dashboard-tab active" role="tabpanel">
              <div className="tab-content">
                <h2>
                  <FaLink /> Matched Items
                </h2>
                <div className="items-list">
                  {isTabLoading ? (
                    <EmptyState
                      icon={FaSpinner}
                      title=""
                      description="Loading..."
                      isSpinning
                    />
                  ) : matches.length === 0 ? (
                    <EmptyState
                      icon={FaLink}
                      title="No Matches Found"
                      description="No matches yet."
                    />
                  ) : (
                    Object.entries(groupedMatches).map(
                      ([foundItemId, itemMatches]) =>
                        itemMatches.length === 1 ? (
                          <SingleMatchCard
                            key={foundItemId}
                            match={itemMatches[0]}
                          />
                        ) : (
                          <MultiMatchSummaryCard
                            key={foundItemId}
                            itemName={itemMatches[0].foundItem.name}
                            matchCount={itemMatches.length}
                            matches={itemMatches}
                          />
                        ),
                    )
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {returnModalItem && (
        <ReturnModal
          foundItem={returnModalItem}
          onConfirm={handleReturnConfirm}
          onClose={() => setReturnModalItem(null)}
          isLoading={updateStatusMutation.isPending}
        />
      )}
      {detailsModalItem && (
        <ReturnDetailsModal
          item={detailsModalItem}
          onClose={() => setDetailsModalItem(null)}
        />
      )}
      {offlineDetailsModalItem && (
        <OfflineCollectedDetailsModal
          item={offlineDetailsModalItem}
          onClose={() => setOfflineDetailsModalItem(null)}
        />
      )}
      {collectOfflineItem && (
        <CollectOfflineModal
          item={collectOfflineItem}
          onConfirm={handleOfflineConfirm}
          onClose={() => setCollectOfflineItem(null)}
          isLoading={collectedOfflineMutation.isPending}
        />
      )}
      {pendingFormData && (
        <SubmitConfirmModal
          formData={pendingFormData}
          onConfirm={handleConfirmSubmit}
          onEdit={handleEditBack}
          isLoading={submitMutation.isPending}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — ManagementDashboard (entry point)
//
// Props:
//   currentUser  — { role, block, name, ... }
//   setLoading   — global loading overlay
//   showMessage  — global toast
// ─────────────────────────────────────────────────────────────────────────────

export default function ManagementDashboard({
  currentUser,
  setLoading,
  showMessage,
}) {
  const role = currentUser?.role;

  // Security can toggle between operational and management view
  const [securityMode, setSecurityMode] = useState("operational");

  // director → always management view
  if (role === "director") {
    return <ManagementView role="director" onBackToOps={null} />;
  }

  // admin → always operational view
  if (role === "admin") {
    return (
      <OperationalView
        currentUser={currentUser}
        setLoading={setLoading}
        showMessage={showMessage}
        onViewDashboard={null}
      />
    );
  }

  // security → operational by default, can switch to management view
  if (role === "security") {
    if (securityMode === "management") {
      return (
        <ManagementView
          role="security"
          onBackToOps={() => setSecurityMode("operational")}
        />
      );
    }
    return (
      <OperationalView
        currentUser={currentUser}
        setLoading={setLoading}
        showMessage={showMessage}
        onViewDashboard={() => setSecurityMode("management")}
      />
    );
  }

  // Fallback
  return (
    <div
      className="page active"
      style={{ padding: "2rem", textAlign: "center" }}
    >
      <p>Unauthorized role: {role}</p>
    </div>
  );
}
