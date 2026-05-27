export const canSelfResolve = (status) => {
  const normalizedStatus = status?.toLowerCase();

  return normalizedStatus === "pending" || normalizedStatus === "matched";
};
