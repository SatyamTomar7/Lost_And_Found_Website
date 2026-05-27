import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  FaBell,
  FaBox,
  FaChartBar,
  FaInbox,
  FaLink,
  FaPlus,
  FaPlusCircle,
  FaSpinner,
  FaUserShield,
} from "react-icons/fa";
import NotificationPanel from "../../shared/components/NotificationPanel";
import authStyles from "../auth/Auth.module.css";
import studentStyles from "../student-dashboard/StudentDashboard.module.css";
import managementStyles from "./ManagementDashboard.module.css";
import buttonStyles from "../../shared/ui/Button.module.css";
import {
  COLORS,
  getLocationsByRole,
  ITEM_CONDITIONS,
  ITEM_NAME,
} from "../../shared/constants/itemConstants";
import {
  getDepartmentFoundItems,
  getMatchStats,
  markItemCollectedOffline,
  submitFoundItem,
  updateFoundItemStatus,
} from "../items/services/itemService";
import {
  getNotifications,
  markAllNotificationAsRead,
  markNotificationAsRead,
} from "../notifications/services/notificationService";
import {
  minSelectableDate,
  OP_QUERY_KEYS,
  OPERATIONAL_QUERY_TIMINGS,
  today,
} from "./constants";
import { foundItemResolver } from "./schemas";
import { EmptyState } from "./shared-components";
import {
  CollectOfflineModal,
  FoundItemCard,
  MultiMatchSummaryCard,
  OfflineCollectedDetailsModal,
  ReturnDetailsModal,
  ReturnModal,
  SingleMatchCard,
  SubmitConfirmModal,
} from "./operational-components";

export default function OperationalView({
  currentUser,
  setLoading,
  showMessage,
  onViewDashboard,
}) {
  const role = currentUser.role;
  const [foundItemsView, setFoundItemsView] = useState("active");
  const [activeTab, setActiveTab] = useState("add-found");
  const [returnModalItem, setReturnModalItem] = useState(null);
  const [detailsModalItem, setDetailsModalItem] = useState(null);
  const [offlineDetailsModalItem, setOfflineDetailsModalItem] = useState(null);
  const [collectOfflineItem, setCollectOfflineItem] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
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

  const { data: foundItems = [], isLoading: foundItemsLoading } = useQuery({
    queryKey: OP_QUERY_KEYS.foundItems,
    queryFn: async () => {
      const r = await getDepartmentFoundItems();
      return r.data.data || [];
    },
    enabled: activeTab === "found-items",
    staleTime: OPERATIONAL_QUERY_TIMINGS.dataStaleTime,
    gcTime: OPERATIONAL_QUERY_TIMINGS.dataGcTime,
    refetchInterval: OPERATIONAL_QUERY_TIMINGS.activeTabRefetchInterval,
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
    staleTime: OPERATIONAL_QUERY_TIMINGS.dataStaleTime,
    refetchInterval: OPERATIONAL_QUERY_TIMINGS.activeTabRefetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: notificationData = { notifications: [], unreadCount: 0 } } =
    useQuery({
      queryKey: OP_QUERY_KEYS.notifications,
      queryFn: async () => {
        const result = await getNotifications();
        return {
          notifications: result.data.notifications || [],
          unreadCount: result.data.unreadCount || 0,
        };
      },
      staleTime: OPERATIONAL_QUERY_TIMINGS.notificationStaleTime,
      refetchInterval: OPERATIONAL_QUERY_TIMINGS.notificationRefetchInterval,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });

  const { notifications, unreadCount } = notificationData;

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
        if (result.data?.matches?.length > 0) {
          setActiveTab("matches");
        } else {
          setActiveTab("found-items");
        }
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
      if (context?.previousFoundItems) {
        queryClient.setQueryData(
          OP_QUERY_KEYS.foundItems,
          context.previousFoundItems,
        );
      }
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

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => markNotificationAsRead(notificationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.notifications }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationAsRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.notifications }),
  });

  const handleUpdateStatus = useCallback(
    (itemId, newStatus) => updateStatusMutation.mutate({ itemId, newStatus }),
    [updateStatusMutation],
  );
  const handleMarkReturned = useCallback((item) => setReturnModalItem(item), []);
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
  const handleViewDetails = useCallback((item) => setDetailsModalItem(item), []);
  const handleMarkOffline = useCallback((item) => setCollectOfflineItem(item), []);
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
  const handleNotificationClick = useCallback(
    (notificationId) => markReadMutation.mutate(notificationId),
    [markReadMutation],
  );
  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

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

  const activeFoundItems = useMemo(() => {
    return foundItems.filter((item) => {
      const age = Date.now() - new Date(item.dateFound).getTime();
      return age <= 7 * 24 * 60 * 60 * 1000;
    });
  }, [foundItems]);

  const oldFoundItems = useMemo(() => {
    return foundItems.filter((item) => {
      const age = Date.now() - new Date(item.dateFound).getTime();
      return age > 7 * 24 * 60 * 60 * 1000;
    });
  }, [foundItems]);

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
      <div className={studentStyles["dashboard-container"]}>
        <header className={studentStyles["dashboard-header"]}>
          <div className={studentStyles["user-info"]}>
            <div className={studentStyles["user-avatar"]}>
              <FaUserShield />
            </div>
            <div className={studentStyles["user-details"]}>
              <h3>
                {currentUser?.block || "-"} Block{" "}
                {role === "security" ? "Security" : "Admin"}
              </h3>
            </div>
          </div>

          <div className={managementStyles["dashboard-header-actions"]}>
            {role === "security" && onViewDashboard && (
              <button
                onClick={onViewDashboard}
                className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]} ${buttonStyles["btn--sm"]} ${managementStyles["view-dashboard-btn"]}`}
              >
                <FaChartBar /> View Dashboard
              </button>
            )}
            {role !== "security" && (
              <button
                onClick={() => setShowNotifications((p) => !p)}
                className={studentStyles["notification-btn"]}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              >
                <FaBell size={20} />
                {unreadCount > 0 && (
                  <span className={studentStyles["notification-badge"]}>
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <nav className={studentStyles["dashboard-nav"]} role="tablist">
          {["add-found", "found-items", "matches"].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`${studentStyles["nav-tab"]} ${activeTab === tab ? studentStyles.active : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace("-", " ").toUpperCase()}
            </button>
          ))}
        </nav>

        <main className="dashboard-content-area">
          {activeTab === "add-found" && (
            <section
              className={`${studentStyles["dashboard-tab"]} ${studentStyles.active}`}
              role="tabpanel"
            >
              <div className={studentStyles["tab-content"]}>
                <h2>
                  <FaPlusCircle /> Add Found Item
                </h2>
                <form
                  onSubmit={handleSubmit(handleFormSubmit)}
                  className={studentStyles["dashboard-form"]}
                >
                  <div className={authStyles["form-row"]}>
                    <div className={authStyles["form-group"]}>
                      <label htmlFor="itemname" className={authStyles["form-label"]}>
                        Item Name *
                      </label>
                      <select
                        id="itemname"
                        {...register("name")}
                        className={`${authStyles["form-control"]} ${errors.name ? authStyles["is-invalid"] : ""}`}
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
                        <div className={authStyles["error-message"]}>
                          {errors.name.message}
                        </div>
                      )}
                    </div>
                    <div className={authStyles["form-group"]}>
                      <label htmlFor="itemColor" className={authStyles["form-label"]}>
                        Color *
                      </label>
                      <select
                        id="itemColor"
                        {...register("color")}
                        className={`${authStyles["form-control"]} ${errors.color ? authStyles["is-invalid"] : ""}`}
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
                        <div className={authStyles["error-message"]} role="alert">
                          {errors.color.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={authStyles["form-row"]}>
                    <div className={authStyles["form-group"]}>
                      <label className={authStyles["form-label"]}>Item Condition *</label>
                      <div className={managementStyles["condition-radio-group"]}>
                        {[ITEM_CONDITIONS.NEW, ITEM_CONDITIONS.USED].map((val) => (
                          <label
                            key={val}
                            className={managementStyles["condition-radio-option"]}
                          >
                            <input
                              type="radio"
                              value={val}
                              {...register("condition")}
                              disabled={isFormDisabled}
                              className={managementStyles["condition-radio-input"]}
                            />
                            {val}
                          </label>
                        ))}
                      </div>
                      {errors.condition && (
                        <div
                          className={`${authStyles["error-message"]} ${managementStyles["condition-error"]}`}
                        >
                          {errors.condition.message}
                        </div>
                      )}
                    </div>
                    <div className={authStyles["form-group"]}>
                      <label htmlFor="brand" className={authStyles["form-label"]}>
                        Brand (optional)
                      </label>
                      <input
                        id="brand"
                        {...register("brand")}
                        className={authStyles["form-control"]}
                        disabled={isFormDisabled}
                      />
                    </div>
                  </div>
                  <div className={authStyles["form-row"]}>
                    <div className={authStyles["form-group"]}>
                      <label htmlFor="placeFound" className={authStyles["form-label"]}>
                        Place Found *
                      </label>
                      <select
                        id="placeFound"
                        {...register("placeFound")}
                        className={`${authStyles["form-control"]} ${errors.placeFound ? authStyles["is-invalid"] : ""}`}
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
                        <div className={authStyles["error-message"]}>
                          {errors.placeFound.message}
                        </div>
                      )}
                    </div>
                    <div className={authStyles["form-group"]}>
                      <label htmlFor="dateFound" className={authStyles["form-label"]}>
                        Date Found *
                      </label>
                      <input
                        id="dateFound"
                        type="date"
                        min={minSelectableDate}
                        max={today}
                        {...register("dateFound")}
                        className={`${authStyles["form-control"]} ${errors.dateFound ? authStyles["is-invalid"] : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.dateFound && (
                        <div className={authStyles["error-message"]}>
                          {errors.dateFound.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
                    disabled={isFormDisabled}
                  >
                    <FaPlus /> {submitMutation.isPending ? "Adding..." : "Add Found Item"}
                  </button>
                </form>
              </div>
            </section>
          )}

          {activeTab === "found-items" && (
            <section
              className={`${studentStyles["dashboard-tab"]} ${studentStyles.active}`}
              role="tabpanel"
            >
              <div className={studentStyles["tab-content"]}>
                <h2>
                  <FaBox /> Department Found Items
                </h2>
                {role === "security" && (
                  <div className={managementStyles["found-items-toggle"]}>
                    <button
                      className={`${buttonStyles.btn} ${foundItemsView === "active" ? buttonStyles["btn--primary"] : buttonStyles["btn--outline"]}`}
                      onClick={() => setFoundItemsView("active")}
                    >
                      Active Items
                    </button>
                    <button
                      className={`${buttonStyles.btn} ${foundItemsView === "old" ? buttonStyles["btn--primary"] : buttonStyles["btn--outline"]}`}
                      onClick={() => setFoundItemsView("old")}
                    >
                      Old Items ({oldFoundItems.length})
                    </button>
                  </div>
                )}
                <div className={studentStyles["items-list"]}>
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
                    (role === "security"
                      ? foundItemsView === "active"
                        ? activeFoundItems
                        : oldFoundItems
                      : activeFoundItems
                    ).map((item) => (
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

          {activeTab === "matches" && (
            <section
              className={`${studentStyles["dashboard-tab"]} ${studentStyles.active}`}
              role="tabpanel"
            >
              <div className={studentStyles["tab-content"]}>
                <h2>
                  <FaLink /> Matched Items
                </h2>
                <div className={studentStyles["items-list"]}>
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

      <NotificationPanel
        isOpen={showNotifications}
        notifications={notifications}
        onClose={handleCloseNotifications}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  );
}
