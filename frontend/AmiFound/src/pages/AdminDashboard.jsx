import {
  COLORS,
  ITEM_CONDITIONS,
  CAMPUS_LOCATIONS,
  ITEM_NAME,
} from "../utils/itemConstants";
import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "react-icons/fa";

import {
  submitFoundItem,
  getDepartmentFoundItems,
  updateFoundItemStatus,
  getMatchStats,
  getMatchedLostItemsForFoundItem,
  markItemCollectedOffline,
} from "../services/itemService";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const today = new Date().toISOString().split("T")[0];

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

// ─── NEW: Zod schema for offline collector form ───────────────────────────────
const collectOfflineSchema = z.object({
  collectorName: z.string().min(1, "Collector name is required"),
  collectorContact: z
    .string()
    .min(1, "Enrollment / contact is required")
    .max(30, "Too long"),
});

const resolver = zodResolver(foundItemSchema);

const QUERY_KEYS = {
  foundItems: ["foundItems"],
  matches: ["matches"],
};

// ─── Submit Confirm Modal ─────────────────────────────────────────────────────
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
              <strong>Once submitted, details cannot be edited.</strong> If
              wrong info is entered, you'll need to mark it unclaimed and
              re-enter. Please verify carefully.
            </p>
          </div>

          <div className="submit-confirm-modal__details">
            <div className="submit-confirm-modal__row">
              <span className="submit-confirm-modal__label">Item Name</span>
              <span className="submit-confirm-modal__value">
                {formData.name}
              </span>
            </div>
            <div className="submit-confirm-modal__row">
              <span className="submit-confirm-modal__label">Color</span>
              <span className="submit-confirm-modal__value">
                {formData.color}
              </span>
            </div>
            <div className="submit-confirm-modal__row">
              <span className="submit-confirm-modal__label">Condition</span>
              <span className="submit-confirm-modal__value">
                {formData.condition}
              </span>
            </div>
            {formData.brand && (
              <div className="submit-confirm-modal__row">
                <span className="submit-confirm-modal__label">Brand</span>
                <span className="submit-confirm-modal__value">
                  {formData.brand}
                </span>
              </div>
            )}
            <div className="submit-confirm-modal__row">
              <span className="submit-confirm-modal__label">Place Found</span>
              <span className="submit-confirm-modal__value">
                {formData.placeFound}
              </span>
            </div>
            <div className="submit-confirm-modal__row">
              <span className="submit-confirm-modal__label">Date Found</span>
              <span className="submit-confirm-modal__value">
                {new Date(formData.dateFound).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="return-modal__footer">
          <button
            className="btn btn--outline"
            onClick={onEdit}
            disabled={isLoading}
          >
            <FaEdit /> Go Back & Edit
          </button>
          <button
            className="btn btn--primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaSpinner className="spin-icon" /> Adding…
              </>
            ) : (
              <>
                <FaCheckCircle /> Confirm & Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ),
);
SubmitConfirmModal.displayName = "SubmitConfirmModal";

// ─── Return Details Modal ─────────────────────────────────────────────────────
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
        {/* Item Info */}
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

        {/* Claimant Info */}
        <div className="return-details__section">
          <p className="return-details__section-label">Claimed By</p>
          <div className="return-details__claimant-grid">
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaUser />
              </span>
              <span className="return-details__claimant-field">Name</span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.name || "N/A"}
              </span>
            </div>
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaEnvelope />
              </span>
              <span className="return-details__claimant-field">Email</span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.email || "N/A"}
              </span>
            </div>
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaIdCard />
              </span>
              <span className="return-details__claimant-field">
                Enrollment No.
              </span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.enrollmentNumber || "N/A"}
              </span>
            </div>
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaPhone />
              </span>
              <span className="return-details__claimant-field">Mobile</span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.phoneNumber || "N/A"}
              </span>
            </div>
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaBox />
              </span>
              <span className="return-details__claimant-field">Course</span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.course || "N/A"}
              </span>
            </div>
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaLink />
              </span>
              <span className="return-details__claimant-field">Branch</span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.branch || "N/A"}
              </span>
            </div>
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaClock />
              </span>
              <span className="return-details__claimant-field">Semester</span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.semester || "N/A"}
              </span>
            </div>
            <div className="return-details__claimant-row">
              <span className="return-details__claimant-icon">
                <FaMapMarkerAlt />
              </span>
              <span className="return-details__claimant-field">Block</span>
              <span className="return-details__claimant-val">
                {item.claimedBy?.block || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Returned On */}
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

// ─── NEW: Collect Offline Modal — captures collector info ─────────────────────
const CollectOfflineModal = ({ item, onConfirm, onClose, isLoading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(collectOfflineSchema),
    defaultValues: { collectorName: "", collectorContact: "" },
  });

  const onSubmit = (data) => {
    onConfirm(item._id, data.collectorName, data.collectorContact);
  };

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

        {/* Item summary */}
        <div className="return-modal__found-summary">
          <p className="return-modal__label">Item being marked as collected:</p>
          <p className="return-modal__item-name">
            <strong>{item.name}</strong> — {item.color} • {item.placeFound}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="return-modal__body" style={{ paddingBottom: 0 }}>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary, #6b7280)",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              Record who collected this item in person so it can be referenced
              later.
            </p>

            {/* Collector Name */}
            <div className="form-group">
              <label htmlFor="collectorName" className="form-label">
                Collector Name *
              </label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <FaUser
                  style={{
                    position: "absolute",
                    left: "12px",
                    color: "var(--text-muted, #9ca3af)",
                    fontSize: "13px",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="collectorName"
                  {...register("collectorName")}
                  className={`form-control ${errors.collectorName ? "is-invalid" : ""}`}
                  placeholder="Full name of the person"
                  disabled={isLoading}
                  style={{ paddingLeft: "34px" }}
                />
              </div>
              {errors.collectorName && (
                <div className="error-message">
                  {errors.collectorName.message}
                </div>
              )}
            </div>

            {/* Enrollment / Contact */}
            <div className="form-group">
              <label htmlFor="collectorContact" className="form-label">
                Enrollment No. / Contact *
              </label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <FaIdCard
                  style={{
                    position: "absolute",
                    left: "12px",
                    color: "var(--text-muted, #9ca3af)",
                    fontSize: "13px",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="collectorContact"
                  {...register("collectorContact")}
                  className={`form-control ${errors.collectorContact ? "is-invalid" : ""}`}
                  placeholder="e.g. A2305214118 or phone number"
                  disabled={isLoading}
                  style={{ paddingLeft: "34px" }}
                />
              </div>
              {errors.collectorContact && (
                <div className="error-message">
                  {errors.collectorContact.message}
                </div>
              )}
            </div>
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

// ─── UPDATED: Offline Collected Details Modal — shows claimedBy info ──────────
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
        {/* Item info */}
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

        {/* Collector info — same structure as ReturnDetailsModal for consistency */}
        <div className="return-details__section">
          <p className="return-details__section-label">Collected By</p>
          <div className="return-details__claimant-card">
            <div className="return-details__avatar">
              <FaUser />
            </div>
            <div className="return-details__claimant-info">
              <div className="return-details__claimant-name">
                {item.claimedBy?.name || "N/A"}
              </div>
              {/* Shows contact (enrollment/phone) instead of email */}
              <div className="return-details__claimant-email">
                <FaIdCard /> {item.claimedBy?.contact || "N/A"}
              </div>
            </div>
          </div>
        </div>

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

// ─── Return Modal ─────────────────────────────────────────────────────────────
const ReturnModal = ({ foundItem, onConfirm, onClose, isLoading }) => {
  const [selectedLostItem, setSelectedLostItem] = useState(null);

  const {
    data: matchedLostItems = [],
    isLoading: loadingMatches,
    isError,
  } = useQuery({
    queryKey: ["matchedLostItems", foundItem._id],
    queryFn: async () => {
      const result = await getMatchedLostItemsForFoundItem(foundItem._id);
      return result.data.data || [];
    },
    staleTime: 0,
  });

  const handleConfirm = () => {
    if (!selectedLostItem) return;
    onConfirm(foundItem._id, selectedLostItem);
  };

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
                  className={`return-modal__list-item ${
                    selectedLostItem?._id === lostItem._id
                      ? "return-modal__list-item--selected"
                      : ""
                  }`}
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
            onClick={handleConfirm}
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

// ─── Match Display Components ─────────────────────────────────────────────────
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
        <span className="match-card__claimant-email">{match.user.email}</span>
      </div>
    </div>
  );
});

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
                matches.reduce((sum, m) => sum + (m.similarity ?? 0), 0) /
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
              const lostImage = match.lostItem?.images?.[0]; // ← define
              return (
                // ← return
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
                      <FaUser /> {match.user?.name ?? "Unknown"} ·
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

// ─── FoundItemCard ────────────────────────────────────────────────────────────
const FoundItemCard = React.memo(
  ({
    item,
    onMarkReturned,
    onUpdateStatus,
    onMarkCollectedOffline,
    isUpdating,
    onViewDetails,
    onViewOfflineDetails,
  }) => {
    // ✅ normalise status — handles "offline returned" with space correctly
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

          {/* ✅ correctly matches "offline returned" from backend */}
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
              <button
                className="btn btn--sm btn--outline"
                onClick={() => onUpdateStatus(item._id, "Unclaimed")}
                disabled={isUpdating}
              >
                <FaClock /> Mark as Unclaimed
              </button>
              {/* ✅ now passes full item, not just id */}
              <button
                className="btn btn--sm btn--collected-offline"
                onClick={() => onMarkCollectedOffline(item)}
                disabled={isUpdating}
                title="Student collected the item in person without using the system"
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

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = ({ currentAdmin, setLoading, showMessage }) => {
  const [activeTab, setActiveTab] = useState("add-found");
  const [returnModalItem, setReturnModalItem] = useState(null);
  const [detailsModalItem, setDetailsModalItem] = useState(null);
  const [offlineDetailsModalItem, setOfflineDetailsModalItem] = useState(null);
  // ✅ NEW: holds the full item waiting for collector info — replaces direct itemId call
  const [collectOfflineItem, setCollectOfflineItem] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver,
    defaultValues: {
      name: "",
      color: "",
      dateFound: "",
      placeFound: "",
      brand: "",
      condition: "Used",
    },
  });

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: foundItems = [], isLoading: foundItemsLoading } = useQuery({
    queryKey: QUERY_KEYS.foundItems,
    queryFn: async () => {
      const result = await getDepartmentFoundItems();
      return result.data.data || [];
    },
    enabled: activeTab === "found-items",
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: QUERY_KEYS.matches,
    queryFn: async () => {
      const result = await getMatchStats();
      return result.data?.matches || [];
    },
    enabled: activeTab === "matches",
    staleTime: 0,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: (data) => submitFoundItem(data),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success) {
        showMessage("Found item added successfully.", "success");
        reset();
        setPendingFormData(null);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foundItems });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.foundItems });
      const previousFoundItems = queryClient.getQueryData(
        QUERY_KEYS.foundItems,
      );
      queryClient.setQueryData(QUERY_KEYS.foundItems, (old = []) =>
        old.map((item) =>
          item._id === itemId ? { ...item, status: newStatus } : item,
        ),
      );
      setLoading(true);
      return { previousFoundItems };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foundItems });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
      setReturnModalItem(null);
      showMessage("Item status updated successfully.", "success");
    },
    onError: (error, variables, context) => {
      if (context?.previousFoundItems) {
        queryClient.setQueryData(
          QUERY_KEYS.foundItems,
          context.previousFoundItems,
        );
      }
      showMessage(error?.message || "Failed to update item status.", "error");
    },
    onSettled: () => setLoading(false),
  });

  // ✅ UPDATED: now accepts collectorName + collectorContact
  const collectedOfflineMutation = useMutation({
    mutationFn: ({ itemId, collectorName, collectorContact }) =>
      markItemCollectedOffline(itemId, collectorName, collectorContact),
    onMutate: async ({ itemId, collectorName, collectorContact }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.foundItems });
      const previousFoundItems = queryClient.getQueryData(
        QUERY_KEYS.foundItems,
      );
      queryClient.setQueryData(QUERY_KEYS.foundItems, (old = []) =>
        old.map((item) =>
          item._id === itemId
            ? {
                ...item,
                status: "offline returned",
                matchedLostItemIds: [],
                // ✅ optimistic update includes collector info for immediate UI
                claimedBy: { name: collectorName, contact: collectorContact },
              }
            : item,
        ),
      );
      setLoading(true);
      return { previousFoundItems };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foundItems });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
      setCollectOfflineItem(null);
      showMessage("Item marked as collected offline.", "success");
    },
    onError: (error, variables, context) => {
      if (context?.previousFoundItems) {
        queryClient.setQueryData(
          QUERY_KEYS.foundItems,
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

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleFormSubmit = useCallback((data) => {
    setPendingFormData(data);
  }, []);

  const handleConfirmSubmit = useCallback(() => {
    if (!pendingFormData) return;
    submitMutation.mutate(pendingFormData);
  }, [pendingFormData, submitMutation]);

  const handleEditBack = useCallback(() => {
    setPendingFormData(null);
  }, []);

  const handleUpdateStatus = useCallback(
    (itemId, newStatus) => updateStatusMutation.mutate({ itemId, newStatus }),
    [updateStatusMutation],
  );

  const handleMarkReturned = useCallback((item) => {
    setReturnModalItem(item);
  }, []);

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

  const handleViewDetails = useCallback((item) => {
    setDetailsModalItem(item);
  }, []);

  // ✅ UPDATED: now opens CollectOfflineModal instead of directly mutating
  const handleMarkCollectedOffline = useCallback((item) => {
    setCollectOfflineItem(item);
  }, []);

  // ✅ NEW: called when admin submits collector info in CollectOfflineModal
  const handleCollectOfflineConfirm = useCallback(
    (itemId, collectorName, collectorContact) => {
      collectedOfflineMutation.mutate({
        itemId,
        collectorName,
        collectorContact,
      });
    },
    [collectedOfflineMutation],
  );

  const handleViewOfflineDetails = useCallback((item) => {
    setOfflineDetailsModalItem(item);
  }, []);

  // ─── Grouped matches ───────────────────────────────────────────────────────
  const groupedMatches = React.useMemo(() => {
    return matches.reduce((acc, match) => {
      const key = match.foundItem.id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [matches]);

  const isAnyUpdating =
    updateStatusMutation.isPending ||
    collectedOfflineMutation.isPending ||
    submitMutation.isPending;

  const isTabLoading =
    (activeTab === "found-items" && foundItemsLoading) ||
    (activeTab === "matches" && matchesLoading);

  const isFormDisabled = isSubmitting || submitMutation.isPending;

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
              <h3>{currentAdmin?.block || "A"} block Admin</h3>
        
            </div>
          </div>
        </header>

        {/* Navigation */}
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
          {/* ── Add Found Tab ── */}
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
                        aria-invalid={errors.color ? "true" : "false"}
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
                        <label
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
                            value={ITEM_CONDITIONS.NEW}
                            {...register("condition")}
                            disabled={isFormDisabled}
                            style={{ width: "16px", height: "16px" }}
                          />
                          New
                        </label>
                        <label
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
                            value={ITEM_CONDITIONS.USED}
                            {...register("condition")}
                            disabled={isFormDisabled}
                            style={{ width: "16px", height: "16px" }}
                          />
                          Used
                        </label>
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
                        {CAMPUS_LOCATIONS.map((location) => (
                          <option key={location} value={location}>
                            {location}
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

          {/* ── Found Items Tab ── */}
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
                        onMarkReturned={handleMarkReturned}
                        onUpdateStatus={handleUpdateStatus}
                        onMarkCollectedOffline={handleMarkCollectedOffline}
                        isUpdating={isAnyUpdating}
                        onViewDetails={handleViewDetails}
                        onViewOfflineDetails={handleViewOfflineDetails}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Matches Tab ── */}
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

      {/* ─── Return Modal ─── */}
      {returnModalItem && (
        <ReturnModal
          foundItem={returnModalItem}
          onConfirm={handleReturnConfirm}
          onClose={() => setReturnModalItem(null)}
          isLoading={updateStatusMutation.isPending}
        />
      )}

      {/* ─── Return Details Modal ─── */}
      {detailsModalItem && (
        <ReturnDetailsModal
          item={detailsModalItem}
          onClose={() => setDetailsModalItem(null)}
        />
      )}

      {/* ─── Offline Collected Details Modal ─── */}
      {offlineDetailsModalItem && (
        <OfflineCollectedDetailsModal
          item={offlineDetailsModalItem}
          onClose={() => setOfflineDetailsModalItem(null)}
        />
      )}

      {/* ─── NEW: Collect Offline Modal — captures collector info ─── */}
      {collectOfflineItem && (
        <CollectOfflineModal
          item={collectOfflineItem}
          onConfirm={handleCollectOfflineConfirm}
          onClose={() => setCollectOfflineItem(null)}
          isLoading={collectedOfflineMutation.isPending}
        />
      )}

      {/* ─── Submit Confirm Modal ─── */}
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
};

export default React.memo(AdminDashboard);
