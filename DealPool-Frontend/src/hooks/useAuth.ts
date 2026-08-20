import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../redux/store";
import {
  fetchMe,
  loginUser,
  registerUser,
  loginWithGoogle,
  logoutUser,
  updateProfile as updateProfileThunk,
  changePassword as changePasswordThunk,
  clearAuthError,
} from "../redux/slices/authSlice";

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, status, initialized, error } = useAppSelector((state) => state.auth);

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === "admin";
  const isLoading = status === "loading";

  const checkAuth = useCallback(() => {
    return dispatch(fetchMe());
  }, [dispatch]);

  const login = useCallback(
    (credentials: { email: string; password: string }) => {
      return dispatch(loginUser(credentials));
    },
    [dispatch]
  );

  const register = useCallback(
    (credentials: { email: string; password: string }) => {
      return dispatch(registerUser(credentials));
    },
    [dispatch]
  );

  const googleAuth = useCallback(
    (payload: string | { idToken: string; refreshToken?: string }) => {
      return dispatch(loginWithGoogle(payload));
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    return dispatch(logoutUser());
  }, [dispatch]);

  const updateProfile = useCallback(
    (payload: { username?: string; email?: string; profile_photo?: string | null }) => {
      return dispatch(updateProfileThunk(payload));
    },
    [dispatch]
  );

  const changePassword = useCallback(
    (payload: { currentPassword: string; newPassword: string }) => {
      return dispatch(changePasswordThunk(payload));
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    initialized,
    error,
    checkAuth,
    login,
    register,
    googleAuth,
    logout,
    updateProfile,
    changePassword,
    clearError,
  };
}
