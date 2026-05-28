import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitLostItem } from "../../items/services/itemService";
import { STUDENT_DASHBOARD_QUERY_KEYS } from "../constants";
import { applyBackendFormErrors } from "../../../shared/lib/formErrorMapper";

export const useSubmitLostItem = ({
  reset,
  setError,
  setPendingFormData,
  setActiveTab,
  setLoading,
  showMessage,
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => submitLostItem(data),
    onMutate: () => setLoading(true),
    onSuccess: () => {
      reset();
      setPendingFormData(null);
      queryClient.invalidateQueries({
        queryKey: STUDENT_DASHBOARD_QUERY_KEYS.lostItems,
      });
      queryClient.invalidateQueries({
        queryKey: STUDENT_DASHBOARD_QUERY_KEYS.notifications,
      });
      showMessage("Lost Item reported successfully!", "success");
      setActiveTab("my-items");
    },
    onError: (err) => {
      if (setError) {
        applyBackendFormErrors(setError, err, {
          fieldMap: {
            "contactInfo.phone": "photo",
          },
          defaultField: "root",
        });
      }
      setPendingFormData(null);
      showMessage(err.message || "Something went wrong", "error");
    },
    onSettled: () => setLoading(false),
  });
};
