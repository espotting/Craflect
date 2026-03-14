import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FcGoogle } from "react-icons/fc";
import logoTransparent from "@/assets/logo-transparent.png";

function usePasswordValidation(password: string) {
  return useMemo(() => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }), [password]);
}

export default function SignUp() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; terms?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const checks = usePasswordValidation(password);
  const passwordValid = checks.minLength && checks.hasUppercase && checks.hasNumber && checks.hasSpecial;
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation((user as any)?.isAdmin ? "/system/founder" : "/home");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading || isAuthenticated) return null;

  const requirements = [
    { id: "length", label: "8 characters min", met: checks.minLength },
    { id: "uppercase", label: "1 uppercase letter", met: checks.hasUppercase },
    { id: "number", label: "1 number", met: checks.hasNumber },
    { id: "special", label: "1 special character", met: checks.hasSpecial },
  ];

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (!passwordValid) {
      newErrors.password = "Password does not meet all requirements";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (!passwordsMatch) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the Terms of Service and Privacy Policy";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});
    try {
      await apiRequest("POST", "/api/auth/register", {
        email: email.trim(),
        firstName: "User",
        lastName: undefined,
        password,
      });
      toast({ title: "Account created!", description: "A verification code has been sent to your email." });
      setLocation(`/email-confirmation?email=${encodeURIComponent(email.trim())}&flow=signup`);
    } catch (err: any) {
      setErrors({ general: err.message || "Registration failed. Please try again." });
    } finally {
      setSubmitting(false);
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
            to="/welcome"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
            data-testid="button-back-welcome"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-signup-title">Create your account</h1>
            <p className="text-gray-400">Start discovering viral trends for free.</p>
          </div>

          {errors.general && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
              data-testid="text-signup-error"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{errors.general}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined, general: undefined })); }}
                  className={`pl-12 h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl ${errors.email ? "border-red-500" : ""}`}
                  autoFocus
                  data-testid="input-signup-email"
                />
              </div>
              {errors.email && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />{errors.email}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); setErrors((p) => ({ ...p, password: undefined })); }}
                  className={`pl-12 pr-12 h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl ${errors.password ? "border-red-500" : ""}`}
                  data-testid="input-signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  tabIndex={-1}
                  data-testid="button-toggle-password-signup"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordTouched && (
                <div className="grid grid-cols-2 gap-2 pt-1" data-testid="password-rules">
                  {requirements.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 text-xs" data-testid={`rule-${req.id}`}>
                      {req.met ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-600" />
                      )}
                      <span className={req.met ? "text-emerald-500" : "text-gray-500"}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                  onPaste={(e) => e.preventDefault()}
                  className={`pl-12 pr-12 h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl ${errors.confirmPassword ? "border-red-500" : ""}`}
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  tabIndex={-1}
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmTouched && confirmPassword.length > 0 && !passwordsMatch && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm flex items-center gap-1" data-testid="text-password-mismatch">
                  <X className="w-3.5 h-3.5" />Passwords do not match
                </motion.p>
              )}
              {confirmTouched && confirmPassword.length > 0 && passwordsMatch && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-500 text-sm flex items-center gap-1" data-testid="text-password-match">
                  <Check className="w-3.5 h-3.5" />Passwords match
                </motion.p>
              )}
            </div>

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => { setAgreedToTerms(checked as boolean); setErrors((p) => ({ ...p, terms: undefined })); }}
                className="mt-0.5 border-gray-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                data-testid="checkbox-terms"
              />
              <label htmlFor="terms" className="text-sm text-gray-400 leading-snug">
                I agree to the{" "}
                <Link to="/terms" className="text-violet-400 hover:text-violet-300">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />{errors.terms}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all"
              data-testid="button-signup-submit"
            >
              {submitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                "Get started for free"
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0a0a0f] text-gray-500">OR</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-14 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl border-0 transition-all"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-google-signup"
          >
            <FcGoogle className="w-5 h-5 mr-3" />
            Continue with Google
          </Button>

          <p className="mt-8 text-center text-gray-400">
            Already have an account?{" "}
            <Link to="/signin" className="text-violet-400 hover:text-violet-300 font-medium transition-colors" data-testid="link-go-login">
              Log in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
