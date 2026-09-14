export const APP_ERROR_FALLBACK_MESSAGE =
  "Something went wrong. We could not display this page. Try again, or reload the application if the problem continues.";

export const getAppErrorRetryState = ({ retryKey }) => ({
  hasError: false,
  retryKey: retryKey + 1,
});
