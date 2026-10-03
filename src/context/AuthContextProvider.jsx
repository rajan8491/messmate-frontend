import { useEffect, useState } from "react";
import AuthContext from "./AuthContext";
import toast from "react-hot-toast";
import { memoryAccessToken, setMemoryToken } from '../services/backend/api';

//after backend done and services written
import {
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
    getMeAPI
} from '../services/backend/authServices';
import { getApiError } from "../utils/helpers";

const AuthContextProvider = ({ children }) => {
    const [auth, setAuth] = useState({
        isLoggedIn: false,
        isVerified: false,
        role: null
    });
    const [authReady, setAuthReady] = useState(false);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [hostelLoading, setHostelLoading] = useState(false);
    const [hostels, setHostels] = useState([]);

    // --- Fetch Hostels Functionality ---
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

    // --- Login Functionality (Password) ---
    const login = async ({ username, password }) => {
        setLoading(true);
        try {
            // Backend API call
            const {user, accessToken} = await loginAPI({ username, password });
            console.log({user, accessToken}); // Debugging line

            // Save access token securely in our axios client closure memory space
            setMemoryToken(accessToken);

            setAuth({
                isLoggedIn: true,
                isVerified: user.verified,
                role: String(user.role).toLowerCase()
            });
            setUser(user);
            setAuthReady(true);

            return { isVerified: user.verified, role: String(user.role).toLowerCase() };
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Signup Functionality --- students only
    const signup = async ({ name, username, rollNo, hostelId, password }) => {
        setLoading(true);
        try {
            await signupAPI({ name, username, rollNo, hostelId, password });
            
            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Verify OTP (Account Verification) --- students only
    const verifyEmail = async ({ identifier, otp, channel }) => {
        setLoading(true);
        try {
            await verifyEmailAPI({ identifier, otp, channel });
            return true;
        } catch(error){
            throw getApiError(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Resend OTP --- students only
    const resendOtp = async (identifier) => {
        setLoading(true);
        try {
            await resendOtpAPI({
                identifier,
                channel: "EMAIL",
                purpose: "SIGNUP" // or "LOGIN" based on context
            });
            
            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Send Login OTP ---
    const sendLoginOTP = async (identifier) => {
        setLoading(true);
        try {
            await sendLoginOtpAPI({
                identifier,
                channel: "EMAIL"
            });
            
            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Login with OTP ---
    const loginWithOTP = async ({ identifier, otp }) => {
        setLoading(true);
        try {
            const {user, accessToken} = await loginWithOtpAPI({
                 identifier,
                 otp,
                 channel: "EMAIL"
                });

            setMemoryToken(accessToken);
            setAuth({
                isLoggedIn: true,
                isVerified: user.verified,
                role: String(user.role).toLowerCase()
            });
            setUser(user);

            return { isVerified: user.verified, role: String(user.role).toLowerCase() };
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoading(false);
        }
    };


    // --- Forgot Password Flow ---
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

    // --- Change Password --- students only
    const changePassword = async ({ oldPassword, newPassword }) => {
        setLoading(true);
        try {
            const response = await changePasswordAPI({ oldPassword, newPassword });
            
            if (response && response.accessToken) {
                setMemoryToken(response.accessToken);
            }

            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Logout Functionality ---
    const logout = async () => {
        setIsLoggingOut(true);
        setLoading(true);
        try {
            await logoutAPI();

            setAuth({
                isLoggedIn: false,
                isVerified: false,
                role: null
            });
            setUser(null);
            setMemoryToken(null);
            
            toast.success("Logged out successfully");
            return true;
        } catch (error) {
            toast.error(getApiError(error).message || "Failed to logout");
        } finally {
            setLoading(false);
            setIsLoggingOut(false);
        }
    };

    const value = {
        fetchHostels, hostels, hostelLoading,
        auth, authReady,
        user,
        loading,
        isLoggingOut,
        setAuth, setUser,
        login,
        sendLoginOTP,
        loginWithOTP,
        signup,
        verifyEmail,
        resendOtp,
        logout,
        changePassword,
        sendForgotPasswordOtp, verifyForgotPasswordOtp, resetPassword
    };
    
    // Check if user is logged in from previous session
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Try to fetch the user profile using the httpOnly cookie
                const userData = await getMeAPI();
                
                setAuth({
                    isLoggedIn: true,
                    isVerified: userData.verified,
                    role: String(userData.role).toLowerCase()
                });
                setUser(userData);
            } catch (error) {
                setAuth({ isLoggedIn: false, isVerified: false, role: null });
                setUser(null);
            } finally {
                setAuthReady(true);
            }
        };

        const bootstrap = async () => {
            try { await fetchHostels(); } catch (e) { console.error('Hostels fetch failed', e); }
            await checkSession();
        };
        bootstrap();
        
    }, []);


    useEffect(() => {
        const handleSessionExpired = () => {
            setAuth({ isLoggedIn: false, isVerified: false, role: null });
            setUser(null);
            setMemoryToken(null);
        };
    
        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }, []);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {/* stop any activity during logging out */}
            {isLoggingOut && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0,0,0,0)',
                    touchAction: 'none',
                    pointerEvents: 'auto'
                }} />
            )}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;