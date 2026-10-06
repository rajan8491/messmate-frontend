import { useState, useContext, useEffect } from "react";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthContext";

export default function ForgotPasswordModal({ initialIdentifier = "", onClose }) {
  const { sendForgotPasswordOtp, resetPassword, loading } = useContext(AuthContext);

  const [step, setStep] = useState(1); // 1: send otp, 2: reset
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!identifier) return toast.error("Enter your email");
    try {
      await sendForgotPasswordOtp(identifier);
      setStep(2);
      setTimer(30);
      toast.success("OTP sent to your email");
    } catch (err) {
      toast.error(err.message || "Failed to send reset code");
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await resetPassword({ identifier, otp, newPassword });
      toast.success("Password reset successfully! Please log in.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to reset password");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>

        <h3 className="text-lg font-bold text-slate-800 mb-1">
          {step === 1 ? "Forgot Password" : "Reset Password"}
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          {step === 1 ? "Enter your email to receive a recovery code." : `Enter code sent to ${identifier}`}
        </p>

        {step === 1 ? (
          <form onSubmit={handleSend} className="space-y-4">
            <input
              type="text"
              required
              placeholder="Enter your registered email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-green-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition"
            >
              {loading ? "Sending..." : "Send Verification OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <input
              type="text"
              required
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-center tracking-widest font-bold focus:outline-none focus:border-green-600"
            />
            <input
              type="password"
              required
              placeholder="New Strong Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-green-600"
            />
            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                disabled={timer > 0}
                onClick={handleSend}
                className="text-green-600 hover:underline disabled:text-slate-400"
              >
                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition"
            >
              {loading ? "Updating..." : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}