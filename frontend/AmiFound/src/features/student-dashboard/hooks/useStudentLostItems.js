import { useQuery } from "@tanstack/react-query";
import { getMyLostItems } from "../../items/services/itemService";
import {
  STUDENT_DASHBOARD_QUERY_KEYS,
  STUDENT_DASHBOARD_QUERY_TIMINGS,
} from "../constants";

export const useStudentLostItems = ({ enabled = false } = {}) =>
  useQuery({
    queryKey: STUDENT_DASHBOARD_QUERY_KEYS.lostItems,
    queryFn: async () => {
      const result = await getMyLostItems();
      return result.data.data || [];
    },
    enabled,
    staleTime: STUDENT_DASHBOARD_QUERY_TIMINGS.dataStaleTime,
    gcTime: STUDENT_DASHBOARD_QUERY_TIMINGS.dataGcTime,
  });
