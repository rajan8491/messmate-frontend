import { useEffect, useState, useCallback } from "react";
import AuthContext from "./AuthContext";
import toast from "react-hot-toast";
import { setMemoryToken } from "../services/backend/api";

import {
  loginWithGoogleAPI,
  verifyWithGoogleAPI,
  registerWithGoogleAPI,
  fetchHostelsAPI,
  loginAPI,
  signupAPI,
  logoutAPI,
  verifyEmailAPI,
  resendOtpAPI,
  sendLoginOtpAPI,
  loginWithOtpAPI,
  sendForgotPasswordOtpAPI,
  verifyForgotPasswordOtpAPI,
  resetPasswordAPI,
  changePasswordAPI,
  getMeAPI,
} from "../services/backend/authServices";
import { getApiError } from "../utils/helpers";

const INITIAL_AUTH = {
  isLoggedIn: false,
  isVerified: false,
  role: null,
  username: null,
};

const AuthContextProvider = ({ children }) => {
  const [auth, setAuth] = useState(INITIAL_AUTH);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hostelLoading, setHostelLoading] = useState(false);
  const [hostels, setHostels] = useState([]);

  // 1. Unified Purge Procedure
  const purgeAllUserData = useCallback(() => {
    // A. Clear In-Memory JWT Access Token
    setMemoryToken(null);

    // B. Reset AuthContext State
    setAuth(INITIAL_AUTH);

    // C. Fire event to purge sibling contexts (Student, Accountant, Admin)
    window.dispatchEvent(new CustomEvent("auth:reset-all-data"));

    // D. Purge any browser storage keys
    localStorage.clear();
    sessionStorage.clear();
  });

  // --- Central Helper: Reusable single-point auth success handler ---
  const handleAuthSuccess = useCallback((data) => {
    if (data?.accessToken) {
      setMemoryToken(data.accessToken);
    }

    const authState = {
      isLoggedIn: true,
      isVerified: true,
      role: String(data.role).toLowerCase(),
      username: data.username,
    };
    setAuth(authState);

    setAuthReady(true);
    return authState;
  }, []);

  // --- Fetch Hostels ---
  const fetchHostels = async () => {
    setHostelLoading(true);
    try {
      const data = await fetchHostelsAPI();
      setHostels(data);
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setHostelLoading(false);
    }
  };

  // --- Login with Google ---
  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const data = await loginWithGoogleAPI(credential);
      const res = handleAuthSuccess(data);
      return { isVerified: true, role: res.role };
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Verify with Google (Signup check) ---
  const verifyWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const data = await verifyWithGoogleAPI(credential);
      if (data.newUser) {
        return data; // { newUser: true, email: "...", name: "..." }
      }
      return handleAuthSuccess(data);
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Complete Google Registration ---
  const completeGoogleRegistration = async ({ token, name, hostelId, rollNo }) => {
    setLoading(true);
    try {
      const data = await registerWithGoogleAPI({ token, name, hostelId, rollNo });
      return handleAuthSuccess(data);
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Login (Password) ---
  const login = async ({ username, password }) => {
    setLoading(true);
    try {
      const data = await loginAPI({ username, password });
      return handleAuthSuccess(data);
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Login (OTP) ---
  const loginWithOTP = async ({ identifier, otp }) => {
    setLoading(true);
    try {
      const data = await loginWithOtpAPI({ identifier, otp, channel: "EMAIL" });
      return handleAuthSuccess(data);
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Verify Email / Signup OTP ---
  const verifyEmail = async ({ identifier, otp, channel }) => {
    setLoading(true);
    try {
      const data = await verifyEmailAPI({ identifier, otp, channel });
      return handleAuthSuccess(data);
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Signup (Metadata submission only) ---
  const signup = async ({ name, email, rollNo, hostelId, password }) => {
    setLoading(true);
    try {
      await signupAPI({ name, email, rollNo, hostelId, password });
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Send OTP Handlers ---
  const resendOtp = async (identifier) => {
    setLoading(true);
    try {
      await resendOtpAPI({ identifier, channel: "EMAIL", purpose: "SIGNUP" });
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const sendLoginOTP = async (identifier) => {
    setLoading(true);
    try {
      await sendLoginOtpAPI({ identifier, channel: "EMAIL" });
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const sendForgotPasswordOtp = async (identifier) => {
    setLoading(true);
    try {
      await sendForgotPasswordOtpAPI(identifier);
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyForgotPasswordOtp = async ({ identifier, otp }) => {
    setLoading(true);
    try {
      await verifyForgotPasswordOtpAPI({ identifier, otp });
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async ({ identifier, otp, newPassword }) => {
    setLoading(true);
    try {
      await resetPasswordAPI({ identifier, otp, newPassword });
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async ({ oldPassword, newPassword }) => {
    setLoading(true);
    try {
      const response = await changePasswordAPI({ oldPassword, newPassword });
      if (response?.accessToken) {
        setMemoryToken(response.accessToken);
      }
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Logout ---
  const logout = async () => {
    setIsLoggingOut(true);
    setLoading(true);
    try {
      await logoutAPI();
      return true;
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to logout");
    } finally {
      // Always purge frontend data regardless of whether backend threw 500/401
      purgeAllUserData();
      toast.success("Logged out successfully");
      setLoading(false);
      setIsLoggingOut(false);
    }
  };


  // Initial check on page refresh/boot
  useEffect(() => {
    const checkSession = async () => {
      try {
        const userData = await getMeAPI();
        setAuth({
          isLoggedIn: true,
          isVerified: true,
          role: String(userData.role).toLowerCase(),
          username: userData.username,
        });
      } catch (error) {
        purgeAllUserData();
      } finally {
        setAuthReady(true);
      }
    };

    const bootstrap = async () => {
      try {
        await fetchHostels();
      } catch (e) {
        console.error("Hostels fetch failed", e);
      }
      await checkSession();
    };

    bootstrap();
  }, []);

  // Session expired event listener
  useEffect(() => {
    const handleSessionExpired = () => {
      purgeAllUserData();
      toast.error("Session expired. Please log in again.");
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  const value = {
    auth,
    authReady,
    loading,
    isLoggingOut,
    hostels,
    hostelLoading,
    fetchHostels,
    login,
    signup,
    logout,
    verifyEmail,
    resendOtp,
    sendLoginOTP,
    loginWithOTP,
    loginWithGoogle,
    verifyWithGoogle,
    completeGoogleRegistration,
    changePassword,
    sendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isLoggingOut && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0)",
            touchAction: "none",
            pointerEvents: "auto",
          }}
        />
      )}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;