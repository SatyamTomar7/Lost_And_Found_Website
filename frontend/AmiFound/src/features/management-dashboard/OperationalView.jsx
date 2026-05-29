import { useCallback, useEffect, useMemo, useState } from "react";
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
import { applyBackendFormErrors } from "../../shared/lib/formErrorMapper";
import {
  COLORS,
  FOUND_ITEM_RECOVERY_MODES,
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
  FOUND_ITEM_RECOVERY_MODES as DASHBOARD_RECOVERY_MODES,
  getMinSelectableDate,
  minSelectableDate,
  OP_QUERY_KEYS,
  OPERATIONAL_QUERY_TIMINGS,
  SECURITY_FOUND_ITEMS_LIMIT,
  today,
} from "./constants";
import { createFoundItemResolver } from "./schemas";
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
  const isSecurity = role === "security";
  const [activeTab, setActiveTab] = useState("add-found");
  const [returnModalItem, setReturnModalItem] = useState(null);
  const [detailsModalItem, setDetailsModalItem] = useState(null);
  const [offlineDetailsModalItem, setOfflineDetailsModalItem] = useState(null);
  const [collectOfflineItem, setCollectOfflineItem] = useState(null);
  const [collectOfflineServerError, setCollectOfflineServerError] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();
  const foundItemResolver = useMemo(
    () => createFoundItemResolver({ isSecurity }),
    [isSecurity],
  );

  const {
    register,
    handleSubmit,
    setError,
    watch,
    reset,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: foundItemResolver,
    defaultValues: {
      name: "",
      color: "",
      recoveryMode: FOUND_ITEM_RECOVERY_MODES.NORMAL,
      dateFound: "",
      placeFound: "",
      brand: "",
      description: "",
      condition: "Used",
    },
  });

  const selectedRecoveryMode = watch(
    "recoveryMode",
    FOUND_ITEM_RECOVERY_MODES.NORMAL,
  );
  const selectedDateFound = watch("dateFound", "");
  const descriptionLength = watch("description", "").length;
  const watchedRecoveryModeFallback =
    selectedRecoveryMode || DASHBOARD_RECOVERY_MODES.NORMAL;
  const currentMinSelectableDate = isSecurity
    ? getMinSelectableDate(watchedRecoveryModeFallback)
    : minSelectableDate;
  const securityFetchAllParams = useMemo(
    () => ({ limit: SECURITY_FOUND_ITEMS_LIMIT }),
    [],
  );

  useEffect(() => {
    if (!isSecurity) return;

    if (selectedDateFound && selectedDateFound < currentMinSelectableDate) {
      resetField("dateFound");
    }
  }, [currentMinSelectableDate, isSecurity, resetField, selectedDateFound]);

  const { data: foundItems = [], isLoading: foundItemsLoading } = useQuery({
    queryKey: OP_QUERY_KEYS.foundItems,
    queryFn: async () => {
      const r = await getDepartmentFoundItems();
      return r.data.data || [];
    },
    enabled: !isSecurity && activeTab === "found-items",
    staleTime: OPERATIONAL_QUERY_TIMINGS.dataStaleTime,
    gcTime: OPERATIONAL_QUERY_TIMINGS.dataGcTime,
    refetchInterval: OPERATIONAL_QUERY_TIMINGS.activeTabRefetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: activeFoundItems = [], isLoading: activeFoundItemsLoading } =
    useQuery({
      queryKey: [...OP_QUERY_KEYS.foundItems, "security-active"],
      queryFn: async () => {
        const r = await getDepartmentFoundItems({
          ...securityFetchAllParams,
          recoveryMode: DASHBOARD_RECOVERY_MODES.NORMAL,
          age: "active",
        });
        return r.data.data || [];
      },
      enabled: isSecurity && activeTab === "active-found",
      staleTime: OPERATIONAL_QUERY_TIMINGS.dataStaleTime,
      gcTime: OPERATIONAL_QUERY_TIMINGS.dataGcTime,
      refetchInterval: OPERATIONAL_QUERY_TIMINGS.activeTabRefetchInterval,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });

  const { data: oldFoundItems = [], isLoading: oldFoundItemsLoading } =
    useQuery({
      queryKey: [...OP_QUERY_KEYS.foundItems, "security-old"],
      queryFn: async () => {
        const r = await getDepartmentFoundItems({
          ...securityFetchAllParams,
          recoveryMode: DASHBOARD_RECOVERY_MODES.NORMAL,
          age: "old",
        });
        return r.data.data || [];
      },
      enabled: isSecurity && activeTab === "old-found-items",
      staleTime: OPERATIONAL_QUERY_TIMINGS.dataStaleTime,
      gcTime: OPERATIONAL_QUERY_TIMINGS.dataGcTime,
      refetchInterval: OPERATIONAL_QUERY_TIMINGS.activeTabRefetchInterval,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });

  const {
    data: enquiryRecoveredItems = [],
    isLoading: enquiryRecoveredItemsLoading,
  } = useQuery({
      queryKey: OP_QUERY_KEYS.enquiryRecoveredItems,
      queryFn: async () => {
        const r = await getDepartmentFoundItems({
          ...securityFetchAllParams,
          recoveryMode: DASHBOARD_RECOVERY_MODES.ENQUIRY_RECOVERED,
        });
        return r.data.data || [];
      },
    enabled: isSecurity && activeTab === "enquiry-recovered",
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
      enabled: role !== "security",
      staleTime: OPERATIONAL_QUERY_TIMINGS.notificationStaleTime,
      refetchInterval: OPERATIONAL_QUERY_TIMINGS.notificationRefetchInterval,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });

  const { notifications, unreadCount } = notificationData;
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const submitMutation = useMutation({
    mutationFn: (data) =>
      submitFoundItem({
        ...data,
        recoveryMode: isSecurity
          ? data.recoveryMode || FOUND_ITEM_RECOVERY_MODES.NORMAL
          : FOUND_ITEM_RECOVERY_MODES.NORMAL,
      }),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success) {
        showMessage("Found item added successfully.", "success");
        reset();
        setPendingFormData(null);
        queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.foundItems });
        queryClient.invalidateQueries({
          queryKey: OP_QUERY_KEYS.enquiryRecoveredItems,
        });
        queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.matches });
        if (result.data?.matches?.length > 0) {
          setActiveTab("matches");
          scrollToTop();
        } else if (isSecurity) {
          const submittedRecoveryMode =
            result.data?.foundItem?.recoveryMode ||
            pendingFormData?.recoveryMode ||
            FOUND_ITEM_RECOVERY_MODES.NORMAL;

          setActiveTab(
            submittedRecoveryMode === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED
              ? "enquiry-recovered"
              : "active-found",
          );
          scrollToTop();
        } else {
          setActiveTab("found-items");
          scrollToTop();
        }
      } else {
        setPendingFormData(null);
        showMessage(result.message || "Failed to add found item.", "error");
      }
    },
    onError: (error) => {
      applyBackendFormErrors(setError, error);
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
      await queryClient.cancelQueries({
        queryKey: OP_QUERY_KEYS.enquiryRecoveredItems,
      });
      const prev = queryClient.getQueryData(OP_QUERY_KEYS.foundItems);
      const prevEnquiry = queryClient.getQueryData(
        OP_QUERY_KEYS.enquiryRecoveredItems,
      );
      queryClient.setQueryData(OP_QUERY_KEYS.foundItems, (old = []) =>
        old.map((item) =>
          item._id === itemId ? { ...item, status: newStatus } : item,
        ),
      );
      queryClient.setQueryData(OP_QUERY_KEYS.enquiryRecoveredItems, (old = []) =>
        old.map((item) =>
          item._id === itemId ? { ...item, status: newStatus } : item,
        ),
      );
      setLoading(true);
      return { previousFoundItems: prev, previousEnquiryItems: prevEnquiry };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OP_QUERY_KEYS.foundItems });
      queryClient.invalidateQueries({
        queryKey: OP_QUERY_KEYS.enquiryRecoveredItems,
      });
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
      if (context?.previousEnquiryItems) {
        queryClient.setQueryData(
          OP_QUERY_KEYS.enquiryRecoveredItems,
          context.previousEnquiryItems,
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
      await queryClient.cancelQueries({
        queryKey: OP_QUERY_KEYS.enquiryRecoveredItems,
      });
      const prev = queryClient.getQueryData(OP_QUERY_KEYS.foundItems);
      const prevEnquiry = queryClient.getQueryData(
        OP_QUERY_KEYS.enquiryRecoveredItems,
      );
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
      queryClient.setQueryData(OP_QUERY_KEYS.enquiryRecoveredItems, (old = []) =>
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
        previousEnquiryItems: prevEnquiry,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: OP_QUERY_KEYS.foundItems,
      });
      queryClient.invalidateQueries({
        queryKey: OP_QUERY_KEYS.enquiryRecoveredItems,
      });
      queryClient.invalidateQueries({
        queryKey: OP_QUERY_KEYS.matches,
      });
      setCollectOfflineServerError(null);
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
      if (context?.previousEnquiryItems) {
        queryClient.setQueryData(
          OP_QUERY_KEYS.enquiryRecoveredItems,
          context.previousEnquiryItems,
        );
      }
      setCollectOfflineServerError(error);
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
  const handleMarkOffline = useCallback((item) => {
    setCollectOfflineServerError(null);
    setCollectOfflineItem(item);
  }, []);
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
  const handleFormSubmit = useCallback(
    (data) =>
      setPendingFormData({
        ...data,
        recoveryMode: isSecurity
          ? data.recoveryMode || selectedRecoveryMode || FOUND_ITEM_RECOVERY_MODES.NORMAL
          : FOUND_ITEM_RECOVERY_MODES.NORMAL,
      }),
    [isSecurity, selectedRecoveryMode],
  );
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

  const securityDateCutoff = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 6);
    return cutoff;
  }, []);

  const isEnquiryRecoveredItem = useCallback(
    (item) =>
      item?.recoveryMode === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED,
    [],
  );

  const isNewFoundItem = useCallback(
    (item) => {
      if (!item || isEnquiryRecoveredItem(item) || !item.dateFound) return false;
      return new Date(item.dateFound) >= securityDateCutoff;
    },
    [isEnquiryRecoveredItem, securityDateCutoff],
  );

  const isOldFoundItem = useCallback(
    (item) => {
      if (!item || isEnquiryRecoveredItem(item) || !item.dateFound) return false;
      return new Date(item.dateFound) < securityDateCutoff;
    },
    [isEnquiryRecoveredItem, securityDateCutoff],
  );

  const filteredActiveFoundItems = useMemo(
    () => activeFoundItems.filter(isNewFoundItem),
    [activeFoundItems, isNewFoundItem],
  );

  const filteredOldFoundItems = useMemo(
    () => oldFoundItems.filter(isOldFoundItem),
    [isOldFoundItem, oldFoundItems],
  );

  const filteredEnquiryRecoveredItems = useMemo(
    () => enquiryRecoveredItems.filter(isEnquiryRecoveredItem),
    [enquiryRecoveredItems, isEnquiryRecoveredItem],
  );

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

  const operationalTabs = useMemo(
    () =>
      isSecurity
        ? [
            { id: "add-found", label: "ADD FOUND" },
            { id: "active-found", label: "NEW FOUND ITEMS" },
            { id: "old-found-items", label: "OLD FOUND ITEMS" },
            { id: "enquiry-recovered", label: "ENQUIRY RECOVERED" },
            { id: "matches", label: "MATCHES" },
          ]
        : [
            { id: "add-found", label: "ADD FOUND" },
            { id: "found-items", label: "FOUND ITEMS" },
            { id: "matches", label: "MATCHES" },
          ],
    [isSecurity],
  );

  const isAnyUpdating =
    updateStatusMutation.isPending ||
    collectedOfflineMutation.isPending ||
    submitMutation.isPending;
  const isFormDisabled = isSubmitting || submitMutation.isPending;
  const isTabLoading =
    (activeTab === "found-items" && foundItemsLoading) ||
    (activeTab === "active-found" && activeFoundItemsLoading) ||
    (activeTab === "old-found-items" && oldFoundItemsLoading) ||
    (activeTab === "enquiry-recovered" && enquiryRecoveredItemsLoading) ||
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
                {role === "security"
                  ? "Security Department"
                  : `${currentUser?.block || "-"} Block Admin`}
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
          {operationalTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${studentStyles["nav-tab"]} ${activeTab === tab.id ? studentStyles.active : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
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
                        className={`${authStyles["form-control"]} ${errors.brand ? authStyles["is-invalid"] : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.brand && (
                        <div className={authStyles["error-message"]}>
                          {errors.brand.message}
                        </div>
                      )}
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
                        min={currentMinSelectableDate}
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
                  {isSecurity && (
                    <div className={authStyles["form-group"]}>
                      <label
                        htmlFor="recoveryMode"
                        className={authStyles["form-label"]}
                      >
                        Recovery Mode
                      </label>
                      <select
                        id="recoveryMode"
                        {...register("recoveryMode")}
                        className={`${authStyles["form-control"]} ${errors.recoveryMode ? authStyles["is-invalid"] : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value={FOUND_ITEM_RECOVERY_MODES.NORMAL}>
                          Normal
                        </option>
                        <option
                          value={FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED}
                        >
                          Enquiry Recovered
                        </option>
                      </select>
                      {errors.recoveryMode && (
                        <div className={authStyles["error-message"]}>
                          {errors.recoveryMode.message}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={authStyles["form-group"]}>
                    <label htmlFor="description" className={authStyles["form-label"]}>
                      Description (optional)
                    </label>
                    <textarea
                      id="description"
                      {...register("description")}
                      className={`${authStyles["form-control"]} ${errors.description ? authStyles["is-invalid"] : ""}`}
                      rows={3}
                      maxLength={500}
                      disabled={isFormDisabled}
                    />
                    <div className={authStyles["form-help"]}>
                      Maximum 500 characters. {descriptionLength}/500
                    </div>
                    {errors.description && (
                      <div className={authStyles["error-message"]}>
                        {errors.description.message}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
                    disabled={isFormDisabled}
                  >
                    <FaPlus /> {submitMutation.isPending ? "Adding..." : "Add Found Item"}
                  </button>
                  {errors.root && (
                    <div className={authStyles["error-message"]}>
                      {errors.root.message}
                    </div>
                  )}
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

          {activeTab === "active-found" && isSecurity && (
            <section
              className={`${studentStyles["dashboard-tab"]} ${studentStyles.active}`}
              role="tabpanel"
            >
              <div className={studentStyles["tab-content"]}>
                <h2>
                  <FaBox /> New Found Items
                </h2>
                <div className={studentStyles["items-list"]}>
                  {isTabLoading ? (
                    <EmptyState
                      icon={FaSpinner}
                      title=""
                      description="Loading..."
                      isSpinning
                    />
                  ) : filteredActiveFoundItems.length === 0 ? (
                    <EmptyState
                      icon={FaInbox}
                      title="No New Found Items"
                      description="No normal found items from the last 7 days."
                    />
                  ) : (
                    filteredActiveFoundItems.map((item) => (
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

          {activeTab === "old-found-items" && isSecurity && (
            <section
              className={`${studentStyles["dashboard-tab"]} ${studentStyles.active}`}
              role="tabpanel"
            >
              <div className={studentStyles["tab-content"]}>
                <h2>
                  <FaBox /> Old Found Items
                </h2>
                <div className={studentStyles["items-list"]}>
                  {isTabLoading ? (
                    <EmptyState
                      icon={FaSpinner}
                      title=""
                      description="Loading..."
                      isSpinning
                    />
                  ) : filteredOldFoundItems.length === 0 ? (
                    <EmptyState
                      icon={FaInbox}
                      title="No Old Found Items"
                      description="No normal found items older than 7 days."
                    />
                  ) : (
                    filteredOldFoundItems.map((item) => (
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

          {activeTab === "enquiry-recovered" && isSecurity && (
            <section
              className={`${studentStyles["dashboard-tab"]} ${studentStyles.active}`}
              role="tabpanel"
            >
              <div className={studentStyles["tab-content"]}>
                <h2>
                  <FaBox /> Enquired Recovered Items
                </h2>
                <div className={studentStyles["items-list"]}>
                  {isTabLoading ? (
                    <EmptyState
                      icon={FaSpinner}
                      title=""
                      description="Loading..."
                      isSpinning
                    />
                  ) : filteredEnquiryRecoveredItems.length === 0 ? (
                    <EmptyState
                      icon={FaInbox}
                      title="No Enquiry Recovered Items"
                      description="No enquiry recovered items found yet."
                    />
                  ) : (
                    filteredEnquiryRecoveredItems.map((item) => (
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
          onClose={() => {
            setCollectOfflineItem(null);
            setCollectOfflineServerError(null);
          }}
          isLoading={collectedOfflineMutation.isPending}
          serverError={collectOfflineServerError}
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
