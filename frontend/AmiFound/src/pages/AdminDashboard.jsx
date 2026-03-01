import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FaPalette,
  FaTag,
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
} from "react-icons/fa";

import {
  submitFoundItem,
  getDepartmentFoundItems,
  updateFoundItemStatus,
  getMatchStats,
  getMatchedLostItemsForFoundItem,
} from "../services/itemService";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const today = new Date().toISOString().split("T")[0];

const foundItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  color: z.string().min(1, "Color is required"),
  category: z.string().min(1, "Category is required"),
  dateFound: z
    .string()
    .min(1, "Date is required")
    .refine((d) => d <= today, { message: "Date cannot be in the future" }),
  placeFound: z.string().min(1, "Location is required"),
});

const resolver = zodResolver(foundItemSchema);

const QUERY_KEYS = {
  foundItems: ["foundItems"],
  matches: ["matches"],
};

// ─── Return Details Modal ─────────────────────────────────────────────────────
const ReturnDetailsModal = ({ item, onClose }) => {
  return (
    <div className="return-modal-overlay" onClick={onClose}>
      <div
        className="return-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
      >
        {/* Header */}
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

        {/* Body */}
        <div className="return-details__body">
          {/* Item Info */}
          <div className="return-details__section">
            <p className="return-details__section-label">Returned Item</p>
            <div className="return-details__item-card">
              <div className="return-details__item-name">{item.name}</div>
              <div className="item-meta">
                <span><FaPalette /> {item.color}</span>
                <span><FaTag /> {item.category}</span>
                <span><FaMapMarkerAlt /> {item.placeFound}</span>
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
            <div className="return-details__claimant-card">
              <div className="return-details__avatar">
                <FaUser />
              </div>
              <div className="return-details__claimant-info">
                <div className="return-details__claimant-name">
                  {item.claimedBy?.name || "N/A"}
                </div>
                <div className="return-details__claimant-email">
                  <FaEnvelope /> {item.claimedBy?.email || "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Return Date */}
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

        {/* Footer */}
        <div className="return-modal__footer">
          <button className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

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
                      <span><FaPalette /> {lostItem.color}</span>
                      <span><FaMapMarkerAlt /> {lostItem.placeLost}</span>
                      <span>
                        <FaCalendarAlt />{" "}
                        {new Date(lostItem.dateLost).toLocaleDateString()}
                      </span>
                    </div>
                    {lostItem.userId && (
                      <div className="return-modal__list-item-user">
                        <FaUser /> {lostItem.userId.name}
                        {lostItem.userId.email && (
                          <span> · <FaEnvelope /> {lostItem.userId.email}</span>
                        )}
                      </div>
                    )}
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
              <><FaSpinner className="spin-icon" /> Processing…</>
            ) : (
              <><FaCheck /> Confirm Return</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Match Display Components ─────────────────────────────────────────────────
const SingleMatchCard = React.memo(({ match }) => (
  <div className="item-card match-card--single">
    <div className="match-card__header">
      <span className="match-card__badge match-card__badge--single">
        <FaLink /> 1 Match Found
      </span>
      <span className="match-card__similarity">
        <FaPercentage /> {match.similarity.toFixed(0)}% match
      </span>
    </div>

    <div className="match-card__grid">
      <div className="match-card__side match-card__side--found">
        <p className="match-card__side-label">Found Item</p>
        <h4 className="match-card__item-name">{match.foundItem.name}</h4>
        <div className="item-meta">
          <span><FaPalette /> {match.foundItem.color}</span>
          <span><FaTag /> {match.foundItem.category}</span>
          <span><FaMapMarkerAlt /> {match.foundItem.placeFound}</span>
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
          <span><FaPalette /> {match.lostItem.color}</span>
          <span><FaTag /> {match.lostItem.category}</span>
          <span><FaMapMarkerAlt /> {match.lostItem.placeLost}</span>
          <span>
            <FaCalendarAlt />{" "}
            {new Date(match.lostItem.dateLost).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>

    <div className="match-card__claimant">
      <FaUser />
      <span className="match-card__claimant-name">{match.user.name}</span>
      <span className="match-card__claimant-sep">·</span>
      <FaEnvelope />
      <span className="match-card__claimant-email">{match.user.email}</span>
    </div>
  </div>
));

const MultiMatchSummaryCard = React.memo(({ itemName, matchCount, matches }) => {
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
          <FaMapMarkerAlt /> {matches[0]?.foundItem?.department}
        </span>
        <span className="match-card__avg-sim">
          Avg similarity:{" "}
          <strong>
            {(
              matches.reduce((sum, m) => sum + m.similarity, 0) / matchCount
            ).toFixed(0)}%
          </strong>
        </span>
      </div>

      <button
        className="match-card__toggle"
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide details" : "Show all matches"}
        <span className={`match-card__chevron ${expanded ? "match-card__chevron--up" : ""}`}>
          ▾
        </span>
      </button>

      {expanded && (
        <ul className="match-card__expanded-list">
          {matches.map((match, idx) => (
            <li key={match.lostItem.id} className="match-card__expanded-item">
              <div className="match-card__expanded-rank">#{idx + 1}</div>
              <div className="match-card__expanded-info">
                <div className="match-card__expanded-name">
                  {match.lostItem.name}
                  <span className="match-card__expanded-sim">
                    {match.similarity.toFixed(0)}%
                  </span>
                </div>
                <div className="item-meta">
                  <span><FaPalette /> {match.lostItem.color}</span>
                  <span><FaMapMarkerAlt /> {match.lostItem.placeLost}</span>
                </div>
                <div className="match-card__expanded-user">
                  <FaUser /> {match.user.name} · <FaEnvelope /> {match.user.email}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

// ─── Sub-Components ──────────────────────────────────────────────────────────
const FoundItemCard = React.memo(({ item, onMarkReturned, onUpdateStatus, isUpdating, onViewDetails }) => (
  <div className="item-card">
    <div className="item-header">
      <div className="item-info">
        <h4>{item.name}</h4>
        <div className="item-meta">
          <span><FaPalette /> {item.color}</span>
          <span><FaTag /> {item.category}</span>
          <span><FaCalendarAlt /> {new Date(item.dateFound).toLocaleDateString()}</span>
          <span><FaMapMarkerAlt /> {item.placeFound}</span>
        </div>
        {item.matchedLostItemIds?.length > 0 && (
          <div className="item-match-badge">
            <FaLink /> {item.matchedLostItemIds.length} match
            {item.matchedLostItemIds.length > 1 ? "es" : ""} found
          </div>
        )}
      </div>
      <span className={`status status--${item.status.toLowerCase()}`}>
        {item.status}
      </span>
    </div>
    <div className="item-actions">
      {/* ── If returned: show View Details only ── */}
      {item.status.toLowerCase() === "returned" ? (
        <button
          className="btn btn--sm btn--info"
          onClick={() => onViewDetails(item)}
        >
          <FaInfoCircle /> View Details
        </button>
      ) : (
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
        </>
      )}
    </div>
  </div>
));

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
  const [detailsModalItem, setDetailsModalItem] = useState(null); // ← NEW
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
      category: "",
      dateFound: "",
      placeFound: "",
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
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: QUERY_KEYS.matches,
    queryFn: async () => {
      const result = await getMatchStats();
      return result.data.data?.matches || [];
    },
    enabled: activeTab === "matches",
    refetchInterval: 5000,
    staleTime: 0,
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
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foundItems });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
        setActiveTab("matches");
      }
    },
    onSettled: () => setLoading(false),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, newStatus, lostItemId, claimedByUserId }) =>
      updateFoundItemStatus(itemId, newStatus, lostItemId, claimedByUserId),
    onMutate: () => setLoading(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foundItems });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
      setReturnModalItem(null);
      showMessage("Item status updated successfully.", "success");
    },
    onError: () => {
      showMessage("Failed to update item status.", "error");
    },
    onSettled: () => setLoading(false),
  });

  const onSubmit = (data) => submitMutation.mutate(data);

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

  // ← NEW
  const handleViewDetails = useCallback((item) => {
    setDetailsModalItem(item);
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
              <h3>{currentAdmin?.department || "Block A"} Admin</h3>
              <p>{currentAdmin?.department || "Block A"}</p>
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
                <h2><FaPlusCircle /> Add Found Item</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="dashboard-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="itemName" className="form-label">Item Name *</label>
                      <input
                        id="itemName"
                        {...register("name")}
                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.name && <div className="error-message">{errors.name.message}</div>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="itemColor" className="form-label">Color *</label>
                      <input
                        id="itemColor"
                        {...register("color")}
                        className={`form-control ${errors.color ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.color && <div className="error-message">{errors.color.message}</div>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="itemCategory" className="form-label">Category *</label>
                      <select
                        id="itemCategory"
                        {...register("category")}
                        className={`form-control ${errors.category ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value="">Select Category</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Books">Books</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Daily Items">Daily Items</option>
                        <option value="Jewelry">Jewelry</option>
                        <option value="Documents">Documents</option>
                      </select>
                      {errors.category && <div className="error-message">{errors.category.message}</div>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="dateFound" className="form-label">Date Found *</label>
                      <input
                        id="dateFound"
                        type="date"
                        max={today}
                        {...register("dateFound")}
                        className={`form-control ${errors.dateFound ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.dateFound && <div className="error-message">{errors.dateFound.message}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="placeFound" className="form-label">Place Found *</label>
                    <input
                      id="placeFound"
                      {...register("placeFound")}
                      className={`form-control ${errors.placeFound ? "is-invalid" : ""}`}
                      disabled={isFormDisabled}
                    />
                    {errors.placeFound && <div className="error-message">{errors.placeFound.message}</div>}
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
                <h2><FaBox /> Department Found Items</h2>
                <div className="items-list">
                  {isTabLoading ? (
                    <EmptyState icon={FaSpinner} title="" description="Loading..." isSpinning />
                  ) : foundItems.length === 0 ? (
                    <EmptyState icon={FaInbox} title="No Found Items" description="No items found yet." />
                  ) : (
                    foundItems.map((item) => (
                      <FoundItemCard
                        key={item._id}
                        item={item}
                        onMarkReturned={handleMarkReturned}
                        onUpdateStatus={handleUpdateStatus}
                        isUpdating={updateStatusMutation.isPending}
                        onViewDetails={handleViewDetails}
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
                <h2><FaLink /> Matched Items</h2>
                <div className="items-list">
                  {isTabLoading ? (
                    <EmptyState icon={FaSpinner} title="" description="Loading..." isSpinning />
                  ) : matches.length === 0 ? (
                    <EmptyState icon={FaLink} title="No Matches Found" description="No matches yet." />
                  ) : (
                    Object.entries(groupedMatches).map(([foundItemId, itemMatches]) =>
                      itemMatches.length === 1 ? (
                        <SingleMatchCard key={foundItemId} match={itemMatches[0]} />
                      ) : (
                        <MultiMatchSummaryCard
                          key={foundItemId}
                          itemName={itemMatches[0].foundItem.name}
                          matchCount={itemMatches.length}
                          matches={itemMatches}
                        />
                      )
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
    </div>
  );
};

export default React.memo(AdminDashboard);