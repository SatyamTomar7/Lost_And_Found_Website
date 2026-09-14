import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useCursorPagination = ({
  queryKey,
  queryFn,
  filters = [],
  staleTime,
}) => {
  const filterKey = JSON.stringify(filters);
  const [page, setPage] = useState(1);
  const [cursorHistory, setCursorHistory] = useState([null]);

  useEffect(() => {
    setPage(1);
    setCursorHistory([null]);
  }, [filterKey]);

  const cursor = cursorHistory[page - 1] || null;
  const queryKeyWithCursor = useMemo(
    () => [...queryKey, filterKey, page, cursor],
    [cursor, filterKey, page, queryKey],
  );
  const query = useQuery({
    queryKey: queryKeyWithCursor,
    queryFn: () => queryFn({ cursor, limit: 10 }),
    staleTime,
    placeholderData: keepPreviousData,
    select: (response) => response.data,
  });

  const nextCursor = query.data?.pagination?.nextCursor || null;
  const hasNextPage = Boolean(nextCursor) && !query.isFetching;
  const hasPreviousPage = page > 1 && !query.isFetching;

  return {
    ...query,
    page,
    hasNextPage,
    hasPreviousPage,
    goNext: () => {
      if (!hasNextPage) return;
      setCursorHistory((history) => [...history.slice(0, page), nextCursor]);
      setPage((currentPage) => currentPage + 1);
    },
    goPrevious: () => {
      if (hasPreviousPage) setPage((currentPage) => currentPage - 1);
    },
  };
};
