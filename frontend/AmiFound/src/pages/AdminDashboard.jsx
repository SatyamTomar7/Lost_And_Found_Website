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
} from "react-icons/fa";

import {
  submitFoundItem,
  getDepartmentFoundItems,
  updateFoundItemStatus,
  getMatchStats,
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

// ─── Sub-Components ──────────────────────────────────────────────────────────
const FoundItemCard = React.memo(({ item, onUpdateStatus, isUpdating }) => (
  <div className="item-card">
    <div className="item-header">
      <div className="item-info">
        <h4>{item.name}</h4>
        <div className="item-meta">
          <span>
            <FaPalette /> {item.color}
          </span>
          <span>
            <FaTag /> {item.category}
          </span>
          <span>
            <FaCalendarAlt /> {new Date(item.dateFound).toLocaleDateString()}
          </span>
          <span>
            <FaMapMarkerAlt /> {item.placeFound}
          </span>
        </div>
      </div>
      <span className={`status status--${item.status.toLowerCase()}`}>
        {item.status}
      </span>
    </div>
    <div className="item-actions">
      <button
        className="btn btn--sm btn--secondary"
        onClick={() => onUpdateStatus(item._id, "Returned")}
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
    </div>
  </div>
));

const MatchCard = React.memo(({ match }) => (
  <div className="item-card">
    <div className="item-header">
      <div className="item-info">
        <h4>
          Match: {match.foundItem.name} ↔ {match.lostItem.name}
        </h4>
        <div className="item-meta">
          <span>
            <FaUser /> {match.user.name}
          </span>
          <span>
            <FaEnvelope /> {match.user.email}
          </span>
          <span>
            <FaPercentage /> {match.similarity.toFixed(0)}% match
          </span>
        </div>
      </div>
    </div>
    <div className="item-description">
      <strong>Found Item:</strong> {match.foundItem.color}{" "}
      {match.foundItem.name} at {match.foundItem.placeFound}
      <br />
      <strong>Lost Item:</strong> {match.lostItem.color} {match.lostItem.name}{" "}
      at {match.lostItem.placeLost}
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

  // Queries
  const { data: foundItems = [], isLoading: foundItemsLoading } = useQuery({
    queryKey: QUERY_KEYS.foundItems,
    queryFn: async () => {
      const result = await getDepartmentFoundItems();
      return result.data.data || [];
    },
    enabled: activeTab === "found-items",
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: QUERY_KEYS.matches,
    queryFn: async () => {
      const result = await getMatchStats();
      return result.data.data?.matches || [];
    },
    enabled: activeTab === "matches",
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Mutations
  const submitMutation = useMutation({
    mutationFn: (data) => submitFoundItem(data),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      //use async
      if (result.success) {
        showMessage("Found item added successfully.", "success");
        reset();
        queryClient.invalidateQueries({
          //added await
          queryKey: QUERY_KEYS.foundItems,
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches }); //added await
        setActiveTab("matches");
      }
    },
    onSettled: () => setLoading(false),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, newStatus }) =>
      updateFoundItemStatus(itemId, newStatus),
    onMutate: () => setLoading(true),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foundItems }),
    onSettled: () => setLoading(false),
  });

  const onSubmit = (data) => submitMutation.mutate(data);
  const handleUpdateStatus = useCallback(
    (itemId, newStatus) => updateStatusMutation.mutate({ itemId, newStatus }),
    [updateStatusMutation],
  );

  const isTabLoading =
    (activeTab === "found-items" && foundItemsLoading) ||
    (activeTab === "matches" && matchesLoading);
  const isFormDisabled = isSubmitting || submitMutation.isPending;

  return (
    <div className="page active">
      <div className="dashboard-container">
        {/* Header - Semantic Landmark */}
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

        {/* Navigation - Semantic Tablist */}
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

        {/* MAIN Content Landmark - Score 100/100 Fix */}
        <main className="dashboard-content-area">
          {activeTab === "add-found" && (
            <section className="dashboard-tab active" role="tabpanel">
              <div className="tab-content">
                <h2>
                  <FaPlusCircle /> Add Found Item
                </h2>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="dashboard-form"
                >
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="itemName" className="form-label">
                        Item Name *
                      </label>
                      <input
                        id="itemName"
                        {...register("name")}
                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
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
                      <input
                        id="itemColor"
                        {...register("color")}
                        className={`form-control ${errors.color ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.color && (
                        <div className="error-message">
                          {errors.color.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="itemCategory" className="form-label">
                        Category *
                      </label>
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
                      {errors.category && (
                        <div className="error-message">
                          {errors.category.message}
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

                  <div className="form-group">
                    <label htmlFor="placeFound" className="form-label">
                      Place Found *
                    </label>
                    <input
                      id="placeFound"
                      {...register("placeFound")}
                      className={`form-control ${errors.placeFound ? "is-invalid" : ""}`}
                      disabled={isFormDisabled}
                    />
                    {errors.placeFound && (
                      <div className="error-message">
                        {errors.placeFound.message}
                      </div>
                    )}
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
                        key={item.id}
                        item={item}
                        onUpdateStatus={handleUpdateStatus}
                        isUpdating={updateStatusMutation.isPending}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

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
                    matches.map((match) => (
                      <MatchCard
                        key={`${match.foundItem.id}-${match.lostItem.id}`}
                        match={match}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default React.memo(AdminDashboard);
