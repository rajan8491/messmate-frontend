/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { z } from "zod";
import AuthContext from "../../context/AuthContext";
import { assets } from "../../assets/assets";
import { validateWithZod } from "../../utils/validateWithZod";
import { standardSignupSchema, googleProfileSetupSchema } from "../../schemas/auth.schema";


export default function Signup() {
  const {
    signup,
    verifyWithGoogle,
    completeGoogleRegistration,
    hostels,
    fetchHostels,
    loading,
    auth,
  } = useContext(AuthContext);
  const navigate = useNavigate();

  // Step 1: Standard form + Google button
  // Step 2: Google profile completion (Name + Hostel)
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Standard Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    hostelId: "",
    password: "",
  });

  // Google Incomplete User State
  const [googleData, setGoogleData] = useState({
    googleToken: "",
    email: "",
    name: "",
    hostelId: "",
    rollNo: "",
  });

  useEffect(() => {
    if (auth?.isLoggedIn && auth?.isVerified) {
      navigate(`/${auth.role}/home`, { replace: true });
    }
    fetchHostels();
  }, [auth, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleGoogleChange = (e) => {
    const { name, value } = e.target;
    setGoogleData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Standard Form Submission (Name, Email, Hostel, Password)
  const handleStandardSignup = async (e) => {
    e.preventDefault();

    // 1. Validate with Zod
    const { success, errors: validationErrors, data } = validateWithZod(standardSignupSchema, formData);

    if (!success) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Auto-extract roll number from Nitkkr college email prefix
      const rollNo = data.email.split("@")[0];

      await signup({
        name: data.name,
        username: data.email,
        email: data.email,
        hostelId: data.hostelId,
        rollNo: rollNo,
        password: data.password,
      });

      toast.success("Account created! Please verify your email.");
      navigate("/verify-email", { state: { email: data.email } });
    } catch (err) {
      toast.error(err.message || "Signup failed");
    }
  };

  // Google OAuth Success Trigger
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await verifyWithGoogle(credentialResponse.credential);

      // Backend returns newUser flag if account doesn't exist yet
      if (res?.newUser) {
        const rollNoAuto = res.email.split("@")[0];
        setGoogleData({
          googleToken: credentialResponse.credential,
          email: res.email,
          name: res.name || "",
          rollNo: isNaN(rollNoAuto) ? "" : rollNoAuto,
          hostelId: "",
        });
        setErrors({});
        setStep(2); // Move to Step 2: Set Name & Hostel
        toast.success("Google verified! Complete your profile to continue.");
      } else {
        toast.success("Welcome back!");
        navigate(`/${res.role}/home`, { replace: true });
      }
    } catch (err) {
      toast.error(err.message || "Google registration failed");
    }
  };

  // Step 2 Submission for Google User
  const handleGoogleProfileComplete = async (e) => {
    e.preventDefault();

    // 2. Validate Google Step 2 with Zod
    const { success, errors: validationErrors, data } = validateWithZod(googleProfileSetupSchema, {
      name: googleData.name,
      hostelId: googleData.hostelId,
    });

    if (!success) {
      setErrors(validationErrors);
      return;
    }

    try {
      const res = await completeGoogleRegistration({
        token: googleData.googleToken,
        name: data.name,
        hostelId: data.hostelId,
        rollNo: googleData.rollNo,
      });

      toast.success("Profile created successfully!");
      navigate(`/${res.role || "student"}/home`, { replace: true });
    } catch (err) {
      toast.error(err.message || "Failed to complete setup");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/70 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50">

        {/* Logo & Heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src={assets.logo}
            alt="MessMate"
            className="h-10 w-auto mb-3 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {step === 1 ? "Create Account" : "Complete Profile"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === 1
              ? "Join MessMate to manage your hostel meals"
              : "Select your hostel and confirm your name"}
          </p>
        </div>

        {/* STEP 1: Standard Signup + Continue with Google */}
        {step === 1 && (
          <>
            <form onSubmit={handleStandardSignup} className="space-y-3.5" noValidate>
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Rahul Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition outline-none ${
                    errors.name
                      ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400/20"
                      : "border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                  }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">College Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="rollno@nitkkr.ac.in"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition outline-none ${
                    errors.email
                      ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400/20"
                      : "border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
              </div>

              {/* Hostel Dropdown */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Hostel</label>
                <div className="relative">
                  <select
                    name="hostelId"
                    value={formData.hostelId}
                    onChange={handleChange}
                    className={`w-full appearance-none px-4 py-2.5 bg-white rounded-xl border text-sm cursor-pointer transition outline-none ${
                      errors.hostelId
                        ? "border-red-400 bg-red-50/40 text-red-600 focus:ring-2 focus:ring-red-400/20"
                        : "border-slate-200 text-slate-700 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    }`}
                  >
                    <option value="" disabled>Select your hostel</option>
                    {hostels?.map((h) => (
                      <option key={h.id} value={String(h.id)}>
                        Hostel {h.id} - {String(h.residents || "").toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3.5 top-3.5 text-xs text-slate-400 pointer-events-none" />
                </div>
                {errors.hostelId && <p className="text-red-500 text-xs mt-1 ml-1">{errors.hostelId}</p>}
              </div>

              {/* Password */}
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
                {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition active:scale-[0.99] disabled:opacity-50 shadow-md shadow-green-600/20"
              >
                {loading ? "Creating..." : "Sign Up"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="w-full border-t border-slate-200"></div>
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                or
              </span>
            </div>

            {/* Google Button */}
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
          </>
        )}

        {/* STEP 2: Profile Setup if Continued with Google */}
        {step === 2 && (
          <form onSubmit={handleGoogleProfileComplete} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300" noValidate>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Google Email</label>
              <input
                type="text"
                disabled
                value={googleData.email}
                className="w-full px-4 py-2.5 bg-slate-100 rounded-xl border border-slate-200 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Confirm your name"
                value={googleData.name}
                onChange={handleGoogleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition outline-none ${
                  errors.name
                    ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400/20"
                    : "border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                }`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Select Hostel</label>
              <div className="relative">
                <select
                  name="hostelId"
                  value={googleData.hostelId}
                  onChange={handleGoogleChange}
                  className={`w-full appearance-none px-4 py-2.5 bg-white rounded-xl border text-sm cursor-pointer transition outline-none ${
                    errors.hostelId
                      ? "border-red-400 bg-red-50/40 text-red-600 focus:ring-2 focus:ring-red-400/20"
                      : "border-slate-200 text-slate-700 focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                  }`}
                >
                  <option value="" disabled>Choose your hostel</option>
                  {hostels?.map((h) => (
                    <option key={h.id} value={String(h.id)}>
                      Hostel {h.id} - {String(h.residents || "").toUpperCase()}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3.5 top-3.5 text-xs text-slate-400 pointer-events-none" />
              </div>
              {errors.hostelId && <p className="text-red-500 text-xs mt-1 ml-1">{errors.hostelId}</p>}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setStep(1);
                }}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition active:scale-[0.99] disabled:opacity-50 shadow-md shadow-green-600/20"
              >
                {loading ? "Saving..." : "Save & Proceed"}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-green-600 font-semibold hover:underline">
            Log in
          </Link>
        </p>

      </div>
    </div>
  );
}