export function apiErrorMessage(error, fallback = "The request could not be completed.") {
  const status = error?.response?.status;
  if (!error?.response) return "Unable to reach the service. Check your connection and try again.";
  if (status === 401) {
    return error.response.data?.message || "Your sign-in is invalid or has expired.";
  }
  if (status === 403) {
    return error.response.data?.message || "You do not have permission to do that.";
  }
  if (status === 429) {
    return error.response.data?.message || "Too many attempts. Please wait before trying again.";
  }
  if (status === 503) {
    return error.response.data?.message || "The service is temporarily unavailable.";
  }
  if (status >= 500) return "The service encountered an error. Please try again later.";
  return error.response.data?.message || fallback;
}

export function attachApiErrorHandling(client, onUnauthorized) {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) onUnauthorized?.(error);
      error.userMessage = apiErrorMessage(error);
      return Promise.reject(error);
    },
  );
}
