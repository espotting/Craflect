import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FcGoogle } from "react-icons/fc";
import logoTransparent from "@/assets/logo-transparent.png";

export default function SignIn() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation((user as any)?.isAdmin ? "/system/founder" : "/home");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading || isAuthenticated) return null;

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
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
      const res = await apiRequest("POST", "/api/auth/login", {
        email: email.trim(),
        password,
      });
      const data = await res.json();

      if (data.needsVerification) {
        setLocation(`/email-confirmation?email=${encodeURIComponent(email.trim())}&flow=login`);
        toast({ title: "Verification needed", description: "Please verify your email to continue." });
      } else if (data.needsAdminVerification) {
        sessionStorage.setItem("adminChallengeToken", data.challengeToken || "");
        setLocation(`/admin-verification?email=${encodeURIComponent(email.trim())}`);
        toast({ title: "Admin verification", description: "A verification code has been sent to your email." });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Welcome back!", description: "Successfully signed in." });
        setLocation(data.user?.isAdmin ? "/system/founder" : "/home");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("No account found")) {
        setErrors({ general: "No account found with this email address." });
      } else if (msg.includes("Incorrect password")) {
        setErrors({ general: "Invalid email or password. Please try again." });
      } else {
        setErrors({ general: msg || "Login failed. Please try again." });
      }
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
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-signin-title">Log in</h1>
            <p className="text-gray-400">Enter your email and password to sign in.</p>
          </div>

          {errors.general && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
              data-testid="text-login-error"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{errors.general}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                  className={`pl-12 h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl ${errors.email ? "border-red-500 focus:border-red-500" : ""}`}
                  autoFocus
                  data-testid="input-login-email"
                />
              </div>
              {errors.email && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />{errors.email}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
                <Link to="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300 transition-colors" data-testid="link-forgot-password">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                  className={`pl-12 pr-12 h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl ${errors.password ? "border-red-500 focus:border-red-500" : ""}`}
                  data-testid="input-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                  data-testid="button-toggle-password-login"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />{errors.password}
                </motion.p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all"
              data-testid="button-login-submit"
            >
              {submitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                "Sign in"
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
            data-testid="button-google-login"
          >
            <FcGoogle className="w-5 h-5 mr-3" />
            Log in with Google
          </Button>

          <p className="mt-8 text-center text-gray-400">
            New to Craflect?{" "}
            <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors" data-testid="link-go-signup">
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
