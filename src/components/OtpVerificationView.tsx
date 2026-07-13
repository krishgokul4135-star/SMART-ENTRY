import React from "react";
import { ShieldCheck, MessageSquare, RefreshCw, LogOut, Smartphone, Sparkles } from "lucide-react";
import { User } from "../types";

interface OtpVerificationViewProps {
  currentUser: User;
  initialSimulatedOtp?: string;
  onOtpVerified: (updatedUser: User) => void;
  onLogout: () => void;
  triggerNotification: (type: "success" | "error", msg: string) => void;
}

export default function OtpVerificationView({
  currentUser,
  initialSimulatedOtp,
  onOtpVerified,
  onLogout,
  triggerNotification
}: OtpVerificationViewProps) {
  const [mobileNumber, setMobileNumber] = React.useState(currentUser.mobileNumber || "");
  const [otp, setOtp] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [simulatedOtp, setSimulatedOtp] = React.useState(initialSimulatedOtp || "");
  const [countdown, setCountdown] = React.useState(30);

  // Mask the mobile number for privacy (e.g. +91 ******4321)
  const maskMobile = (num: string) => {
    if (!num) return "+91 ******3210";
    const cleaned = num.replace(/\s+/g, "");
    if (cleaned.length <= 4) return `+91 ******${cleaned}`;
    return `+91 ******${cleaned.slice(-4)}`;
  };

  // Timer for OTP Resend
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6 || isNaN(Number(otp))) {
      setError("Please enter a valid 6-digit numeric verification code.");
      triggerNotification("error", "Invalid OTP format.");
      return;
    }

    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      triggerNotification("error", "Invalid mobile number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          otp: otp.trim(),
          mobileNumber: mobileNumber.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification("success", "Multi-Factor Authentication complete!");
        onOtpVerified(data.user);
      } else {
        setError(data.error || "MFA validation failed.");
        triggerNotification("error", data.error || "MFA validation failed.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      triggerNotification("error", "MFA validation connection failure.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: mobileNumber.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCountdown(30);
        if (data.simulatedOtp) {
          setSimulatedOtp(data.simulatedOtp);
        }
        triggerNotification("success", "A new OTP code has been triggered!");
      } else {
        setError(data.error || "Failed to trigger a new OTP.");
      }
    } catch (err) {
      setError("Network error resending OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black font-sans selection:bg-[#00FF00] selection:text-black flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="border-4 border-black p-5 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
          <div className="inline-flex items-center gap-1.5 bg-black text-[#00FF00] font-mono px-2.5 py-1 text-[10px] font-black tracking-widest uppercase rounded-sm mb-2">
            <ShieldCheck className="h-3 w-3" />
            SECURE MFA ENFORCED
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
            DEVICE VERIFICATION
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            College Management Authentication Layer
          </p>
        </div>

        {/* OTP Form Card */}
        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-full border-2 border-black bg-emerald-50 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Smartphone className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold">
                An OTP has been dispatched to your registered device:
              </p>
              <p className="text-sm font-black text-black mt-0.5 tracking-wide">
                {maskMobile(mobileNumber || "")}
              </p>
            </div>
          </div>

          {/* Mobile Number Input Section */}
          <div className="space-y-2 bg-slate-50 border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600">
              Registered Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-mono text-sm font-bold text-slate-500">+91</span>
              <input
                type="tel"
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 10-digit mobile number"
                className="w-full pl-12 pr-3 py-2 border-2 border-black bg-white font-mono text-sm font-bold focus:outline-none focus:bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-semibold leading-tight">
              * The database column will be filled with this number upon successful OTP verification.
            </p>
          </div>

          {/* Dev Simulated OTP Alert */}
          {simulatedOtp && (
            <div className="bg-[#00FF00]/10 border-2 border-[#00FF00] p-3 text-xs font-semibold text-emerald-950 flex flex-col gap-1 rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" />
                SIMULATED DEV TELEMETRY CODE:
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-base font-black tracking-widest bg-white border border-black/20 px-2 py-0.5">
                    {simulatedOtp}
                  </span>
                  {mobileNumber.length >= 6 && (
                    <span className="text-[9px] text-slate-500 font-mono">
                      (Or use last 6 digits of mobile: <strong className="text-black">{mobileNumber.slice(-6)}</strong>)
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOtp(simulatedOtp)}
                    className="text-[10px] font-black uppercase underline hover:text-black tracking-tight"
                  >
                    [Autofill Dev Code]
                  </button>
                  {mobileNumber.length >= 6 && (
                    <button
                      type="button"
                      onClick={() => setOtp(mobileNumber.slice(-6))}
                      className="text-[10px] font-black uppercase underline hover:text-black tracking-tight"
                    >
                      [Autofill Mobile Code]
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border-2 border-rose-600 p-3 text-xs font-bold text-rose-700 uppercase tracking-tight">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 text-center">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black py-2.5 border-2 border-black bg-white focus:outline-none focus:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white hover:bg-[#00FF00] hover:text-black py-3 font-black uppercase text-sm border-2 border-black tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex justify-center items-center gap-1.5"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Verify & Proceed"
              )}
            </button>
          </form>

          {/* Resend Actions */}
          <div className="border-t border-dashed border-slate-300 pt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">
              Didn't receive the SMS?
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isLoading}
              className={`font-black uppercase tracking-tight text-[11px] hover:underline disabled:no-underline disabled:opacity-50 ${
                countdown > 0 ? "text-slate-400" : "text-black"
              }`}
            >
              {countdown > 0 ? `Resend OTP (${countdown}s)` : "Resend Code"}
            </button>
          </div>
        </div>

        {/* Logout Actions */}
        <div className="text-center">
          <button
            onClick={onLogout}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black bg-white hover:bg-rose-50 hover:text-rose-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cancel and Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
