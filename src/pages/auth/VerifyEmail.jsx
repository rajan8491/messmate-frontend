import { useContext, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthContext";
import { verifyEmailSchema } from "../../schemas/auth.schema";
import { validateWithZod } from "../../utils/validateWithZod";

export default function VerifyEmail() {
  const { verifyEmail, auth, loading, resendOtp } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth?.isLoggedIn && auth?.isVerified) {
      navigate(`/${auth.role}/home`, { replace: true });
    }
  }, [auth, navigate]);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [resendTimer, setResendTimer] = useState(30);
  const [loadingResend, setLoadingResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    const stateEmail = location.state?.email;
    if (stateEmail) {
      setEmail(stateEmail);
      inputRefs.current[0]?.focus();
    } else {
      toast.error("Session expired or invalid link. Please log in.");
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleDigitChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, "");

    setOtp((prev) => {
      const updated = [...prev];
      updated[index] = cleanValue.slice(-1);
      return updated;
    });

    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasteData) return;

    const newOtp = pasteData.split("");
    setOtp((prev) => {
      const updated = [...prev];
      newOtp.forEach((char, i) => {
        if (i < 6) updated[i] = char;
      });
      return updated;
    });

    const nextIndex = Math.min(newOtp.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
  };

  useEffect(() => {
    const fullOtp = otp.join("");
    if (fullOtp.length === 6 && !loading) {
      submitVerification(fullOtp);
    }
  }, [otp]);

  const submitVerification = async (enteredOtp) => {
    const payload = { email, otp: enteredOtp };

    const { success, errors: validationErrors, data } = validateWithZod(verifyEmailSchema, payload);
    if (!success) {
      setErrors(validationErrors);
      return;
    }

    try {
      const res = await verifyEmail({
        identifier: data.email,
        otp: data.otp,
        channel: "EMAIL",
      });
      toast.success("Email verified successfully");
      navigate(`/${res?.role || "student"}/home`, { replace: true });
    } catch (err) {
      toast.error(err.message || "OTP Verification failed");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    submitVerification(otp.join(""));
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || loadingResend || !email) return;

    setLoadingResend(true);
    try {
      await resendOtp(email);
      toast.success("New verification code sent");
      setResendTimer(30);
      setErrors({});
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.message || "Failed to resend OTP");
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/70 px-3 sm:px-4 font-sans text-slate-800 py-10">
      {/* Changed p-8 to p-5 sm:p-8 to free up horizontal space on phones */}
      <div className="w-full max-w-sm sm:max-w-md bg-white p-5 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="h-14 w-14 sm:h-16 sm:w-16 mb-3 sm:mb-4 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-xl sm:text-2xl shadow-sm border border-green-100">
            <i className="fa-solid fa-envelope-circle-check"></i>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Verify Your Email
          </h2>
          
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 border border-slate-200/60 max-w-full select-none">
            <i className="fa-solid fa-envelope text-[11px] text-slate-400 shrink-0"></i>
            <span className="truncate max-w-[210px] sm:max-w-[260px]">{email || "Your email"}</span>
          </div>
          
          <p className="text-slate-500 text-xs mt-3 leading-relaxed">
            Enter the 6-digit verification code sent to your inbox.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          {/* Responsive Fluid OTP Input Container */}
          <div>
            <div 
              className="flex justify-between items-center gap-1.5 sm:gap-2.5 w-full" 
              onPaste={handlePaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  /* Uses flex-1 min-w-0 max-w-[48px] with aspect-square so it shrinks naturally on small screens */
                  className={`flex-1 min-w-0 max-w-[48px] aspect-square sm:aspect-auto sm:h-14 p-0 text-center text-lg sm:text-xl font-bold rounded-xl border bg-slate-50/50 text-slate-800 transition-all outline-none ${
                    errors.otp
                      ? "border-red-400 bg-red-50/30 text-red-600 focus:ring-2 focus:ring-red-400/20"
                      : digit
                      ? "border-green-600 bg-white shadow-xs focus:ring-2 focus:ring-green-500/20"
                      : "border-slate-200 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                  }`}
                />
              ))}
            </div>

            {errors.otp && (
              <p className="text-red-500 text-xs font-medium text-center mt-2">
                {errors.otp}
              </p>
            )}
          </div>

          {/* Resend Link with Timer */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-500">Didn't receive the code?</span>
            {resendTimer > 0 ? (
              <span className="text-slate-400 font-medium tabular-nums flex items-center gap-1.5">
                <i className="fa-regular fa-clock text-[11px]"></i>
                Resend in {resendTimer}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loadingResend || loading}
                className="text-green-600 font-bold hover:text-green-700 hover:underline disabled:opacity-50 transition-colors"
              >
                {loadingResend ? "Sending..." : "Resend Code"}
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || otp.join("").length < 6}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-green-700 active:scale-[0.99] transition-all shadow-md shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                Verifying Code...
              </>
            ) : (
              <>
                <i className="fa-solid fa-shield-halved text-sm"></i>
                Verify & Continue
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 text-center border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-500">
            Back to{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-green-600 font-bold hover:underline ml-0.5"
            >
              Sign In
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}