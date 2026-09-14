import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markAllNotificationAsRead,
  markNotificationAsRead,
} from "../../notifications/services/notificationService";
import {
  STUDENT_DASHBOARD_QUERY_KEYS,
  STUDENT_DASHBOARD_QUERY_TIMINGS,
} from "../constants";

export const useStudentNotifications = ({ setShowNotifications } = {}) => {
  const queryClient = useQueryClient();

  const { data: notificationData = { notifications: [], unreadCount: 0 } } =
    useQuery({
      queryKey: STUDENT_DASHBOARD_QUERY_KEYS.notifications,
      queryFn: async () => {
        const result = await getNotifications();
        return {
          notifications: result.data.notifications || [],
          unreadCount: result.data.unreadCount || 0,
        };
      },
      staleTime: STUDENT_DASHBOARD_QUERY_TIMINGS.notificationStaleTime,
      refetchInterval:
        STUDENT_DASHBOARD_QUERY_TIMINGS.notificationRefetchInterval,
      refetchIntervalInBackground: false,
    });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => markNotificationAsRead(notificationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: STUDENT_DASHBOARD_QUERY_KEYS.notifications,
      }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationAsRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: STUDENT_DASHBOARD_QUERY_KEYS.notifications,
      }),
  });

  const handleNotificationClick = useCallback(
    (notificationId) => markReadMutation.mutate(notificationId),
    [markReadMutation],
  );

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications?.(false);
    markAllReadMutation.mutate();
  }, [markAllReadMutation, setShowNotifications]);

  return {
    notifications: notificationData.notifications,
    unreadCount: notificationData.unreadCount,
    handleNotificationClick,
    handleCloseNotifications,
    markReadMutation,
    markAllReadMutation,
  };
};
