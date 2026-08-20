import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getErrorMessage } from "../lib/errors";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

/** Axios instance for cookie-based auth (httpOnly access/refresh tokens). */
export const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data === "object" && "success" in data) {
      if (data.success === true) {
        return data.data;
      }
      return Promise.reject(
        data.error || { code: "REQUEST_FAILED", message: "Request failed" }
      );
    }
    return response.data;
  },
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint =
      originalRequest?.url?.includes("/api/auth/login") ||
      originalRequest?.url?.includes("/api/auth/register") ||
      originalRequest?.url?.includes("/api/auth/google") ||
      originalRequest?.url?.includes("/api/auth/refresh");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${apiBase}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        processQueue(null);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        return Promise.reject({
          code: "UNAUTHORIZED",
          message: "Session expired. Please sign in again.",
        });
      } finally {
        isRefreshing = false;
      }
    }

    const envelopeError = error.response?.data?.error;
    if (envelopeError) {
      return Promise.reject({
        code: envelopeError.code || "REQUEST_FAILED",
        message: getErrorMessage(envelopeError, "An unexpected error occurred"),
      });
    }

    if (!error.response) {
      return Promise.reject({
        code: "ERR_NETWORK",
        message:
          "Cannot reach the API. Start DealPool-Backend on port 3000 (or set VITE_BACKEND_URL).",
      });
    }

    const status = error.response.status;
    if (status === 404) {
      return Promise.reject({
        code: "NOT_FOUND",
        message:
          error.response.data?.message ||
          "This endpoint is not available on the backend yet.",
      });
    }

    return Promise.reject({
      code: error.code || "REQUEST_FAILED",
      message: getErrorMessage(error.response.data, error.message || "An unexpected error occurred"),
    });
  }
);

export default api;
