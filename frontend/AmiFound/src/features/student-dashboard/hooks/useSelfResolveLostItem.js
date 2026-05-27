import { useMutation, useQueryClient } from "@tanstack/react-query";
import { selfResolveLostItem } from "../../items/services/itemService";
import { STUDENT_DASHBOARD_QUERY_KEYS } from "../constants";

export const useSelfResolveLostItem = ({ setLoading, setSelfResolveModalItem, showMessage }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId) => selfResolveLostItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({
        queryKey: STUDENT_DASHBOARD_QUERY_KEYS.lostItems,
      });

      const previousLostItems = queryClient.getQueryData(
        STUDENT_DASHBOARD_QUERY_KEYS.lostItems,
      );

      queryClient.setQueryData(
        STUDENT_DASHBOARD_QUERY_KEYS.lostItems,
        (old = []) =>
          old.map((item) =>
            item._id === itemId
              ? { ...item, status: "self resolved", isActive: false }
              : item,
          ),
      );

      setLoading(true);
      return { previousLostItems };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STUDENT_DASHBOARD_QUERY_KEYS.lostItems,
      });
      setSelfResolveModalItem(null);
      showMessage("Great! Your lost report has been closed.", "success");
    },
    onError: (err, _itemId, context) => {
      if (context?.previousLostItems) {
        queryClient.setQueryData(
          STUDENT_DASHBOARD_QUERY_KEYS.lostItems,
          context.previousLostItems,
        );
      }

      showMessage(
        err.message || "Failed to resolve the item. Please try again.",
        "error",
      );
    },
    onSettled: () => setLoading(false),
  });
};
