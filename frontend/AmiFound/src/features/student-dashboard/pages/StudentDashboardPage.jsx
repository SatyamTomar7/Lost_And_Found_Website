import React, { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import NotificationPanel from "../../../shared/components/NotificationPanel";
import {
  minSelectableDate,
  today,
} from "../constants";
import {
  MyItemsTab,
  ProfileTab,
  ReportLostTab,
  SelfResolveModal,
  StudentDashboardHeader,
  StudentDashboardNav,
  SubmitConfirmModal,
} from "../components";
import {
  useSelfResolveLostItem,
  useStudentLostItems,
  useStudentNotifications,
  useSubmitLostItem,
} from "../hooks";
import styles from "../StudentDashboard.module.css";
import { lostItemResolver } from "../validation/lostItemSchema";

const StudentDashboard = ({ currentUser, setLoading, showMessage }) => {
  const [activeTab, setActiveTab] = useState("report-lost");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selfResolveModalItem, setSelfResolveModalItem] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: lostItemResolver,
    defaultValues: {
      name: "",
      color: "",
      brand: "",
      dateLost: "",
      placeLost: "",
      description: "",
      condition: "Used",
    },
  });

  const { data: lostItems = [], isLoading: lostItemsLoading } =
    useStudentLostItems({
      enabled: activeTab === "my-items",
    });

  const {
    notifications,
    unreadCount,
    handleNotificationClick,
    handleCloseNotifications,
  } = useStudentNotifications({ setShowNotifications });

  const submitLostItemMutation = useSubmitLostItem({
    reset,
    setPendingFormData,
    setActiveTab,
    setLoading,
    showMessage,
  });

  const selfResolveMutation = useSelfResolveLostItem({
    setLoading,
    setSelfResolveModalItem,
    showMessage,
  });

  const handleSelfResolveClick = useCallback((item) => {
    setSelfResolveModalItem(item);
  }, []);

  const handleSelfResolveConfirm = useCallback(() => {
    if (!selfResolveModalItem) return;
    selfResolveMutation.mutate(selfResolveModalItem._id);
  }, [selfResolveModalItem, selfResolveMutation]);

  const handleFormSubmit = useCallback((data) => {
    setPendingFormData(data);
  }, []);

  const handleConfirmSubmit = useCallback(() => {
    if (!pendingFormData) return;
    submitLostItemMutation.mutate(pendingFormData);
  }, [pendingFormData, submitLostItemMutation]);

  const handleEditBack = useCallback(() => {
    setPendingFormData(null);
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

  const isFormDisabled = isSubmitting || submitLostItemMutation.isPending;
  const descriptionLength = watch("description", "").length;

  const joinDate = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "N/A";

  return (
    <div className="page active">
      <div className={styles["dashboard-container"]}>
        <StudentDashboardHeader
          currentUser={currentUser}
          unreadCount={unreadCount}
          showNotifications={showNotifications}
          onToggleNotifications={handleToggleNotifications}
        />

        <StudentDashboardNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="dashboard-content-area">
          {activeTab === "report-lost" && (
            <ReportLostTab
              register={register}
              errors={errors}
              handleSubmit={handleSubmit}
              handleFormSubmit={handleFormSubmit}
              isFormDisabled={isFormDisabled}
              currentUser={currentUser}
              submitLostItemMutation={submitLostItemMutation}
              today={today}
              minSelectableDate={minSelectableDate}
              descriptionLength={descriptionLength}
            />
          )}

          {activeTab === "my-items" && (
            <MyItemsTab
              lostItems={lostItems}
              lostItemsLoading={lostItemsLoading}
              onSelfResolve={handleSelfResolveClick}
              isResolving={selfResolveMutation.isPending}
            />
          )}

          {activeTab === "profile" && (
            <ProfileTab currentUser={currentUser} joinDate={joinDate} />
          )}
        </main>
      </div>

      <NotificationPanel
        isOpen={showNotifications}
        notifications={notifications}
        onClose={handleCloseNotifications}
        onNotificationClick={handleNotificationClick}
      />

      {pendingFormData && (
        <SubmitConfirmModal
          formData={pendingFormData}
          onConfirm={handleConfirmSubmit}
          onEdit={handleEditBack}
          isLoading={submitLostItemMutation.isPending}
        />
      )}

      {selfResolveModalItem && (
        <SelfResolveModal
          item={selfResolveModalItem}
          onConfirm={handleSelfResolveConfirm}
          onClose={() => setSelfResolveModalItem(null)}
          isLoading={selfResolveMutation.isPending}
        />
      )}
    </div>
  );
};

export default React.memo(StudentDashboard);
