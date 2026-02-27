import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Loader2, Sun, Moon, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import logoLight from "@/assets/logo-light.png";
import logoTransparent from "@/assets/logo-transparent.png";

type AuthStep = "choose" | "email-form" | "login-form" | "verify-code";

export default function Auth() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get("mode") === "login" ? "login-form" as AuthStep : "choose" as AuthStep;
  const [step, setStep] = useState<AuthStep>(initialMode);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [isLoginFlow, setIsLoginFlow] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading || isAuthenticated) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/register", {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        password: password,
      });
      setIsLoginFlow(false);
      setStep("verify-code");
      toast({ title: "Code sent", description: `A verification code has been sent to ${email}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Registration failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", {
        email: email.trim(),
        password: password,
      });
      const data = await res.json();
      if (data.needsVerification) {
        setIsLoginFlow(true);
        setStep("verify-code");
        toast({ title: "Verification needed", description: "Please verify your email first. A code has been sent." });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Welcome back!", description: "You're signed in." });
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Login failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/verify", { email, code });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome!", description: isLoginFlow ? "You're signed in." : "Your email has been verified." });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message || "Please check your code and try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend", { email });
      toast({ title: "Code resent", description: "A new verification code has been sent." });
    } catch {
      toast({ title: "Error", description: "Failed to resend code", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const PasswordInput = ({ autoFocus = false, testId = "input-password" }: { autoFocus?: boolean; testId?: string }) => (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary pr-12"
        required
        minLength={8}
        autoFocus={autoFocus}
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        data-testid="button-toggle-password"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <button onClick={() => setLocation("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-back-home">
          <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-8 w-auto object-contain" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border"
          data-testid="button-theme-toggle-auth"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <AnimatePresence mode="wait">
            {step === "choose" && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">Welcome to Craflect</h1>
                  <p className="text-muted-foreground">Sign in to your account or create a new one.</p>
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full h-14 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md gap-3 font-medium text-base transition-all"
                    onClick={() => window.location.href = "/api/login"}
                    data-testid="button-google-auth"
                  >
                    <FcGoogle className="w-5 h-5" />
                    Continue with Google
                  </Button>

                  <div className="relative flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-14 rounded-xl border-border text-foreground hover:bg-accent gap-3 font-medium text-base transition-all"
                    onClick={() => setStep("email-form")}
                    data-testid="button-email-auth"
                  >
                    <Mail className="w-5 h-5" />
                    Sign up with Email
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => setStep("login-form")} className="text-primary hover:text-primary/80 font-medium" data-testid="link-go-login-choose">
                    Log in
                  </button>
                </p>
              </motion.div>
            )}

            {step === "login-form" && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <button
                    onClick={() => setStep("choose")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                    data-testid="button-back-choose-login"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">Log in</h1>
                  <p className="text-muted-foreground">Enter your email and password to sign in.</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email address</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                      required
                      autoFocus
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Password</label>
                    <PasswordInput testId="input-login-password" />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || !email.trim() || !password.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium"
                    data-testid="button-login-submit"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button onClick={() => setStep("email-form")} className="text-primary hover:text-primary/80 font-medium" data-testid="link-go-signup">
                    Sign up
                  </button>
                </p>
              </motion.div>
            )}

            {step === "email-form" && (
              <motion.div
                key="email-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <button
                    onClick={() => setStep("choose")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                    data-testid="button-back-choose"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">Create your account</h1>
                  <p className="text-muted-foreground">Enter your details to get started.</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">First name</label>
                      <Input
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                        required
                        autoFocus
                        data-testid="input-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Last name</label>
                      <Input
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                        data-testid="input-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email address</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Password</label>
                    <PasswordInput testId="input-register-password" />
                    <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || !email.trim() || !firstName.trim() || password.length < 8}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium"
                    data-testid="button-send-code"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => setStep("login-form")} className="text-primary hover:text-primary/80 font-medium" data-testid="link-go-login">
                    Log in
                  </button>
                </p>
              </motion.div>
            )}

            {step === "verify-code" && (
              <motion.div
                key="verify-code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <button
                    onClick={() => setStep(isLoginFlow ? "login-form" : "email-form")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                    data-testid="button-back-email"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">Check your email</h1>
                  <p className="text-muted-foreground">
                    We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Verification code</label>
                    <Input
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="bg-background border-border text-foreground h-14 rounded-xl focus-visible:ring-primary text-center text-2xl tracking-[0.5em] font-mono"
                      maxLength={6}
                      autoFocus
                      data-testid="input-code"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || code.length !== 6}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium"
                    data-testid="button-verify"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign in"}
                  </Button>
                </form>

                <div className="text-center">
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    data-testid="button-resend"
                  >
                    {resending ? "Sending..." : "Didn't receive it? Resend code"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
