import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoTransparent from "@/assets/logo-transparent.png";

export default function AdminVerification() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "admin@craflect.com";
  const challengeToken = sessionStorage.getItem("adminChallengeToken") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join("");
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newCode = pastedData.split("").concat(Array(6 - pastedData.length).fill(""));
    setCode(newCode);

    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pastedData.length === 6) {
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (fullCode: string) => {
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth/admin-verify", {
        email,
        code: fullCode,
        challengeToken,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      sessionStorage.removeItem("adminChallengeToken");
      toast({ title: "Welcome back!", description: "Admin access verified." });
      setLocation("/system/founder");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Too many attempts")) {
        setError("Too many attempts. Please request a new code.");
      } else {
        setError("Invalid verification code. Please try again.");
      }
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/admin-resend", { email, challengeToken });
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
      toast({ title: "Code resent", description: "A new verification code has been sent." });
    } catch {
      toast({ title: "Error", description: "Failed to resend code.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <header className="p-6">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2" data-testid="link-back-home">
          <img src={logoTransparent} alt="Craflect" className="h-10 w-auto object-contain" />
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
            data-testid="button-back-signin"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <Shield className="w-10 h-10 text-violet-500" />
          </motion.div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4" data-testid="text-admin-verify-title">Admin Verification</h1>
            <p className="text-gray-400">
              Enter the 6-digit code sent to{" "}
              <span className="text-white font-medium">{email}</span>{" "}
              to access the admin dashboard.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
              data-testid="text-admin-verify-error"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          <div className="flex justify-center gap-3 mb-8" data-testid="input-admin-code">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={submitting}
                className={`w-14 h-16 text-center text-2xl font-bold bg-[#1a1a24] border-2 rounded-xl text-white placeholder:text-gray-600 focus:outline-none transition-all ${
                  error
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-700 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
                }`}
                data-testid={`input-admin-code-${index}`}
              />
            ))}
          </div>

          <Button
            onClick={() => handleSubmit(code.join(""))}
            disabled={code.join("").length !== 6 || submitting}
            className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            data-testid="button-admin-verify-submit"
          >
            {submitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              "Verify & Access Dashboard"
            )}
          </Button>

          <div className="mt-8 text-center">
            <p className="text-gray-500 mb-2">Didn't receive it?</p>
            {countdown > 0 ? (
              <span className="text-gray-600" data-testid="text-admin-countdown">Resend code in {countdown}s</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
                data-testid="button-admin-resend"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                Resend code
              </button>
            )}
          </div>

          <div className="mt-8 p-4 bg-[#1a1a24] rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium text-sm">Secure Admin Access</p>
                <p className="text-gray-500 text-sm mt-1">
                  This verification is required for every admin login to ensure account security.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
