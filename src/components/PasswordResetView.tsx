import React from "react";
import { Key, Lock, AlertOctagon, CheckCircle, RefreshCw, LogOut, Eye, EyeOff } from "lucide-react";
import { User } from "../types";

interface PasswordResetViewProps {
  currentUser: User;
  onPasswordReset: (updatedUser: User) => void;
  onLogout: () => void;
  triggerNotification: (type: "success" | "error", msg: string) => void;
}

export default function PasswordResetView({
  currentUser,
  onPasswordReset,
  onLogout,
  triggerNotification
}: PasswordResetViewProps) {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Validation rules
  const startsWith149 = newPassword.startsWith("149");
  const hasThreeDigitsAfter = /^149\d{3}/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/`~]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startsWith149) {
      setError("Password must start with the department code '149'.");
      triggerNotification("error", "Must start with department code 149.");
      return;
    }

    if (!hasThreeDigitsAfter) {
      setError("Password must have a 3-digit sequence code (e.g., 001 to 027) immediately after 149.");
      triggerNotification("error", "Must include a 3-digit sequence code.");
      return;
    }

    if (!hasSpecial) {
      setError("Password must contain at least one special character symbol (e.g., @, #, $, %).");
      triggerNotification("error", "Must include a special character.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      triggerNotification("error", "Passwords must match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification("success", "Password updated successfully. Access granted!");
        onPasswordReset(data.user);
      } else {
        setError(data.error || "Failed to reset password.");
        triggerNotification("error", data.error || "Failed to reset password.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      triggerNotification("error", "Connection error during password update.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black font-sans selection:bg-[#00FF00] selection:text-black flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Header Banner */}
        <div className="border-4 border-black p-5 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
          <span className="bg-black text-[#00FF00] font-mono px-2.5 py-1 text-[10px] font-black tracking-widest uppercase rounded-sm">
            Security Enforcer
          </span>
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mt-2">
            FORCE PASSWORD CHANGE
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Required on First Login for {currentUser.role.toUpperCase()}
          </p>
        </div>

        {/* Form Card */}
        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="border-b-2 border-black pb-3">
            <p className="text-xs font-bold text-gray-600">
              Welcome, <span className="font-black text-black">{currentUser.name}</span>!
            </p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">
              Your account currently uses a temporary or default credential. To continue accessing the CSE & CYBER SECURITY portal, you must establish a secure private password.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-600 p-3 text-xs font-bold text-red-700 uppercase tracking-tight flex items-start gap-2">
              <AlertOctagon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                New Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g., 149027@Student"
                  className="w-full pl-10 pr-10 py-2 text-sm border-2 border-black bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 h-4.5 w-4.5 text-gray-500 hover:text-black focus:outline-none flex items-center justify-center"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="bg-slate-50 border-2 border-black p-3 space-y-2 text-xs font-semibold">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Password Security Rules:
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 border-2 border-black flex items-center justify-center text-[11px] font-bold ${startsWith149 ? 'bg-[#00FF00]' : 'bg-white'}`}>
                    {startsWith149 ? "✓" : ""}
                  </div>
                  <span className={startsWith149 ? "text-slate-500 line-through font-medium" : "text-slate-700"}>
                    Starts with department code <span className="font-black">149</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 border-2 border-black flex items-center justify-center text-[11px] font-bold ${hasThreeDigitsAfter ? 'bg-[#00FF00]' : 'bg-white'}`}>
                    {hasThreeDigitsAfter ? "✓" : ""}
                  </div>
                  <span className={hasThreeDigitsAfter ? "text-slate-500 line-through font-medium" : "text-slate-700"}>
                    Includes <span className="font-black">3-digit sequence</span> code (e.g. 001 to 027) immediately after
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 border-2 border-black flex items-center justify-center text-[11px] font-bold ${hasSpecial ? 'bg-[#00FF00]' : 'bg-white'}`}>
                    {hasSpecial ? "✓" : ""}
                  </div>
                  <span className={hasSpecial ? "text-slate-500 line-through font-medium" : "text-slate-700"}>
                    At least <span className="font-black">one special symbol</span> present (e.g., @, #, $, %, !)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retype password"
                  className="w-full pl-10 pr-10 py-2 text-sm border-2 border-black bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 h-4.5 w-4.5 text-gray-500 hover:text-black focus:outline-none flex items-center justify-center"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white hover:bg-[#00FF00] hover:text-black py-3 font-black uppercase text-sm border-2 border-black tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex justify-center items-center gap-1.5"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Save and Access Dashboard
            </button>
          </form>
        </div>

        {/* Back Button / Log out */}
        <div className="text-center">
          <button
            onClick={onLogout}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black bg-white hover:bg-rose-50 hover:text-rose-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
