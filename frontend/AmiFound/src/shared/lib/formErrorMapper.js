export const applyBackendFormErrors = (
  setError,
  error,
  options = {},
) => {
  const { fieldMap = {}, defaultField, fallbackMessage } = options;
  const backendErrors = error?.errors || error?.response?.errors || [];

  if (Array.isArray(backendErrors) && backendErrors.length > 0) {
    backendErrors.forEach(({ field, message }) => {
      const mappedField = fieldMap[field] || field;
      if (!mappedField || mappedField === "root") {
        return;
      }

      setError(mappedField, {
        type: "server",
        message,
      });
    });
    return true;
  }

  if (defaultField && error?.message) {
    setError(defaultField, {
      type: "server",
      message: error.message,
    });
    return true;
  }

  if (error?.message || fallbackMessage) {
    setError("root", {
      type: "server",
      message: error?.message || fallbackMessage,
    });
    return true;
  }

  return false;
};
