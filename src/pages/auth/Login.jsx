/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { z } from "zod";
import AuthContext from "../../context/AuthContext";
import { assets } from "../../assets/assets";
import { validateWithZod } from "../../utils/validateWithZod";
import { loginPasswordSchema, loginOtpSchema, requestOtpSchema } from "../../schemas/auth.schema";


export default function Login() {
  const { login, loginWithOTP, sendLoginOTP, loginWithGoogle, loading, auth } =
    useContext(AuthContext);
  const navigate = useNavigate();

  // Mode: 'password' | 'otp'
  const [mode, setMode] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    otp: "",
  });

  const [errors, setErrors] = useState({});

  // Redirect if already logged in and verified
  useEffect(() => {
    if (auth?.isLoggedIn && auth?.isVerified) {
      navigate(`/${auth.role}/home`, { replace: true });
    }
  }, [auth, navigate]);

  // Resend Countdown Timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Switch between Password and OTP Login Modes
  const handleToggleMode = () => {
    setMode((prev) => (prev === "password" ? "otp" : "password"));
    setOtpSent(false);
    setErrors({});
  };

  // Google Sign-In with Unregistered Interceptor
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await loginWithGoogle(credentialResponse.credential);
      toast.success("Welcome back!");
      navigate(`/${res.role}/home`, { replace: true });
    } catch (err) {
      if (err.code === "USER_NOT_FOUND" || err.response?.status === 404) {
        toast.error("Account not found. Please sign up first.");
        setTimeout(() => navigate("/signup"), 1200);
        return;
      }
      toast.error(err.message || "Google login failed");
    }
  };

  // Request OTP for Passwordless Flow
  const handleSendOtp = async () => {
    const { success, errors: validationErrors, data } = validateWithZod(requestOtpSchema, {
      identifier: formData.identifier,
    });

    if (!success) {
      setErrors((prev) => ({ ...prev, ...validationErrors }));
      return;
    }

    try {
      await sendLoginOTP(data.identifier);
      setOtpSent(true);
      setTimer(30);
      toast.success("OTP sent to your email");
    } catch (err) {
      if (err.code === "USER_NOT_FOUND" || err.response?.status === 404) {
        toast.error("Account does not exist. Please sign up first.");
        setTimeout(() => navigate("/signup"), 1400);
        return;
      }
      toast.error(err.message || "Failed to send OTP");
    }
  };

  // Submit Password or OTP Login
  const handleSubmit = async (e) => {
    e.preventDefault();

    const activeSchema = mode === "password" ? loginPasswordSchema : loginOtpSchema;
    const { success, errors: validationErrors, data } = validateWithZod(activeSchema, formData);

    if (!success) {
      setErrors(validationErrors);
      return;
    }

    try {
      let res;
      if (mode === "password") {
        res = await login({
          username: data.identifier,
          password: data.password,
        });
      } else {
        res = await loginWithOTP({
          identifier: data.identifier,
          otp: data.otp,
        });
      }
      toast.success("Login successful");
      navigate(`/${res.role}/home`, { replace: true });
    } catch (err) {
      if (err.code === "USER_NOT_FOUND" || err.response?.status === 404) {
        toast.error("Account does not exist. Please create an account.");
        setTimeout(() => navigate("/signup"), 1400);
        return;
      }
      if (err.code === "EMAIL_UNVERIFIED") {
        navigate("/verify-email", { state: { email: formData.identifier } });
        return;
      }
      toast.error(err.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/70 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src={assets.logo}
            alt="MessMate"
            className="h-10 w-auto mb-3 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in to your MessMate account</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Email / ID Field */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Email</label>
            <input
              type="text"
              name="identifier"
              placeholder="rollno@nitkkr.ac.in"
              value={formData.identifier}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition outline-none ${
                errors.identifier
                  ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400/20"
                  : "border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
              }`}
            />
            {errors.identifier && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.identifier}</p>
            )}
          </div>

          {/* PASSWORD MODE */}
          {mode === "password" ? (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm transition outline-none ${
                    errors.password
                      ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400/20"
                      : "border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-xs`} />
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>
              )}
            </div>
          ) : (
            /* OTP MODE */
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">6-Digit OTP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="otp"
                  maxLength={6}
                  disabled={!otpSent}
                  placeholder="------"
                  value={formData.otp}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-center tracking-widest font-bold disabled:opacity-50 transition outline-none ${
                    errors.otp
                      ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400/20"
                      : "border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={timer > 0 || loading}
                  className="px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap min-w-24 transition"
                >
                  {timer > 0 ? `${timer}s` : otpSent ? "Resend" : "Send OTP"}
                </button>
              </div>
              {errors.otp && (
                <p className="text-red-500 text-xs mt-1 ml-1">{errors.otp}</p>
              )}
            </div>
          )}

          {/* Toggle between Password & OTP login */}
          <div className="text-right">
            <button
              type="button"
              onClick={handleToggleMode}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              {mode === "password" ? "Sign in using OTP instead" : "Use Password instead"}
            </button>
          </div>

          {/* Main Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition active:scale-[0.99] disabled:opacity-50 shadow-md shadow-green-600/20"
          >
            {loading ? "Authenticating..." : mode === "password" ? "Sign In" : "Verify & Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="w-full border-t border-slate-200"></div>
          <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
            or
          </span>
        </div>

        {/* Google SSO Button (Mobile Responsive & Centered) */}
        <div className="w-full flex justify-center [&>div]:!w-full [&>div]:max-w-[340px] [&_iframe]:!mx-auto">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google sign-in failed")}
            shape="pill"
            theme="outline"
            size="large"
            text="signin_with"
            width="100%"
          />
        </div>

        {/* Signup Redirect Link */}
        <p className="mt-7 text-center text-xs text-slate-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-green-600 font-semibold hover:underline">
            Sign up now
          </Link>
        </p>

      </div>
    </div>
  );
}