import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Loader2, Sun, Moon, CheckCircle2, Eye, EyeOff, Check, X, AlertCircle, Shield } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import logoLight from "@/assets/logo-light.png";
import logoTransparent from "@/assets/logo-transparent.png";

type AuthStep = "choose" | "email-form" | "login-form" | "verify-code" | "admin-verify";

function usePasswordValidation(password: string) {
  return useMemo(() => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }), [password]);
}

function isPasswordValid(v: ReturnType<typeof usePasswordValidation>) {
  return v.minLength && v.hasUppercase && v.hasNumber && v.hasSpecial;
}

function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm text-red-500 mt-3"
      data-testid="text-inline-error"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

export default function Auth() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { t } = useLanguage();

  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get("mode") === "login" ? "login-form" as AuthStep : "choose" as AuthStep;
  const [step, setStep] = useState<AuthStep>(initialMode);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");
  const [adminVerifyError, setAdminVerifyError] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");

  const passwordChecks = usePasswordValidation(password);
  const passwordValid = isPasswordValid(passwordChecks);
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation((user as any)?.isAdmin ? "/system/founder" : "/home");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading || isAuthenticated) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !passwordValid) {
      setSignupError(t.auth.toasts.fillAllFields);
      return;
    }
    if (!passwordsMatch) {
      setSignupError(t.auth.passwordsMismatch);
      return;
    }
    setSignupError("");
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/register", {
        email: email.trim(),
        firstName: "User",
        lastName: undefined,
        password: password,
      });
      setIsLoginFlow(false);
      setStep("verify-code");
      toast({ title: t.auth.toasts.codeSent, description: t.auth.toasts.codeSentDesc.replace("{email}", email) });
    } catch (err: any) {
      setSignupError(err.message || t.auth.toasts.registrationFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError(t.auth.toasts.fillAllFields);
      return;
    }
    setLoginError("");
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
        toast({ title: t.auth.toasts.verificationNeeded, description: t.auth.toasts.verificationNeededDesc });
      } else if (data.needsAdminVerification) {
        setAdminCode("");
        setAdminVerifyError("");
        setChallengeToken(data.challengeToken || "");
        setStep("admin-verify");
        toast({ title: t.auth.adminVerify.title, description: t.auth.adminVerify.subtitle });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: t.auth.toasts.welcomeBack, description: t.auth.toasts.signedIn });
        setLocation(data.user?.isAdmin ? "/system/founder" : "/home");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("No account found")) {
        setLoginError(t.auth.toasts.noAccountFound);
      } else if (msg.includes("Incorrect password")) {
        setLoginError(t.auth.toasts.incorrectPassword);
      } else {
        setLoginError(msg || t.auth.toasts.loginFailed);
      }
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
      toast({ title: t.auth.toasts.welcome, description: isLoginFlow ? t.auth.toasts.signedIn : t.auth.toasts.emailVerified });
      setLocation("/home");
    } catch (err: any) {
      toast({ title: t.auth.toasts.invalidCode, description: err.message || t.auth.toasts.invalidCodeDesc, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCode.length !== 6) return;
    setSubmitting(true);
    setAdminVerifyError("");
    try {
      const res = await apiRequest("POST", "/api/auth/admin-verify", { email, code: adminCode, challengeToken });
      const data = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t.auth.toasts.welcomeBack, description: t.auth.toasts.signedIn });
      setLocation("/system/founder");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Too many attempts")) {
        setAdminVerifyError(t.auth.adminVerify.tooManyAttempts);
      } else {
        setAdminVerifyError(t.auth.adminVerify.invalidCode);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminResend = async () => {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/admin-resend", { email, challengeToken });
      setAdminCode("");
      setAdminVerifyError("");
      toast({ title: t.auth.adminVerify.codeSent, description: t.auth.adminVerify.codeSentDesc });
    } catch {
      toast({ title: t.common.error, description: t.auth.adminVerify.resendFailed, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend", { email });
      toast({ title: t.auth.toasts.codeResent, description: t.auth.toasts.codeResentDesc });
    } catch {
      toast({ title: t.common.error, description: t.auth.toasts.resendFailed, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const PasswordRule = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-xs" data-testid={`rule-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {met ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <X className="w-3.5 h-3.5 text-muted-foreground/50" />
      )}
      <span className={met ? "text-emerald-500" : "text-muted-foreground/70"}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <button onClick={() => setLocation("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-back-home">
          <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-10 w-auto object-contain" />
        </button>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border"
            data-testid="button-theme-toggle-auth"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
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
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">{t.auth.welcomeTitle}</h1>
                  <p className="text-muted-foreground whitespace-pre-line">{t.auth.welcomeSubtitle}</p>
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full h-14 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md gap-3 font-medium text-base transition-all"
                    onClick={() => window.location.href = "/api/login"}
                    data-testid="button-google-auth"
                  >
                    <FcGoogle className="w-5 h-5" />
                    {t.auth.continueGoogle}
                  </Button>

                  <div className="relative flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{t.common.or}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-14 rounded-xl border-border text-foreground hover:bg-accent gap-3 font-medium text-base transition-all"
                    onClick={() => setStep("email-form")}
                    data-testid="button-email-auth"
                  >
                    <Mail className="w-5 h-5" />
                    {t.auth.signUpEmail}
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  {t.auth.alreadyAccount}{" "}
                  <button onClick={() => setStep("login-form")} className="text-primary hover:text-primary/80 font-medium" data-testid="link-go-login-choose">
                    {t.auth.logIn}
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
                    {t.common.back}
                  </button>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">{t.auth.logInTitle}</h1>
                  <p className="text-muted-foreground">{t.auth.logInSubtitle}</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t.auth.emailLabel}</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                      className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                      required
                      autoFocus
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t.auth.passwordLabel}</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                        className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary pr-12"
                        required
                        data-testid="input-login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        data-testid="button-toggle-password-login"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium"
                    data-testid="button-login-submit"
                  >
                    {submitting ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" />{t.auth.signingIn}</>) : t.auth.signIn}
                  </Button>
                  <InlineError message={loginError} />
                </form>

                <div className="relative flex items-center gap-4 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{t.common.or}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button
                  className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md gap-3 font-medium text-sm transition-all"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-google-login"
                >
                  <FcGoogle className="w-5 h-5" />
                  {t.auth.logInGoogle}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t.auth.noAccount}{" "}
                  <button onClick={() => setStep("email-form")} className="text-primary hover:text-primary/80 font-medium" data-testid="link-go-signup">
                    {t.auth.signUpLink}
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
                    {t.common.back}
                  </button>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">{t.auth.createAccount}</h1>
                  <p className="text-muted-foreground">{t.auth.createSubtitle}</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t.auth.emailLabel}</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setSignupError(""); }}
                      className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                      required
                      autoFocus
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t.auth.passwordLabel}</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); setSignupError(""); }}
                        className={`bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary pr-12 ${passwordTouched && !passwordValid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                        data-testid="input-register-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        data-testid="button-toggle-password-register"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordTouched && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1" data-testid="password-rules">
                        <PasswordRule met={passwordChecks.minLength} label={t.auth.passwordRules.minLength} />
                        <PasswordRule met={passwordChecks.hasUppercase} label={t.auth.passwordRules.uppercase} />
                        <PasswordRule met={passwordChecks.hasNumber} label={t.auth.passwordRules.number} />
                        <PasswordRule met={passwordChecks.hasSpecial} label={t.auth.passwordRules.special} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t.auth.confirmPassword}</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true); setSignupError(""); }}
                        onPaste={(e) => e.preventDefault()}
                        className={`bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary pr-12 ${confirmTouched && confirmPassword.length > 0 && !passwordsMatch ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                        data-testid="input-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        data-testid="button-toggle-confirm-password"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmTouched && confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="text-xs text-destructive flex items-center gap-1.5" data-testid="text-password-mismatch">
                        <X className="w-3.5 h-3.5" />
                        {t.auth.passwordsMismatch}
                      </p>
                    )}
                    {confirmTouched && confirmPassword.length > 0 && passwordsMatch && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1.5" data-testid="text-password-match">
                        <Check className="w-3.5 h-3.5" />
                        {t.auth.passwordsMatch}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || !email.trim() || !passwordValid || !passwordsMatch || confirmPassword.length === 0}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium"
                    data-testid="button-send-code"
                  >
                    {submitting ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" />{t.auth.creatingAccount}</>) : t.auth.createButton}
                  </Button>
                  <InlineError message={signupError} />
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  {t.auth.alreadyAccount}{" "}
                  <button onClick={() => setStep("login-form")} className="text-primary hover:text-primary/80 font-medium" data-testid="link-go-login">
                    {t.auth.logIn}
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
                    {t.common.back}
                  </button>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">{t.auth.checkEmail}</h1>
                  <p className="text-muted-foreground">
                    {t.auth.codeSentTo} <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t.auth.codeLabel}</label>
                    <Input
                      placeholder={t.auth.codePlaceholder}
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
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t.auth.verifyButton}
                  </Button>
                </form>

                <div className="text-center">
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    data-testid="button-resend"
                  >
                    {resending ? t.auth.resending : `${t.auth.didntReceive} ${t.auth.resendCode}`}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "admin-verify" && (
              <motion.div
                key="admin-verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <button
                    onClick={() => { setStep("login-form"); setAdminCode(""); setAdminVerifyError(""); }}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                    data-testid="button-back-admin-verify"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t.common.back}
                  </button>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-3">{t.auth.adminVerify.title}</h1>
                  <p className="text-muted-foreground">{t.auth.adminVerify.subtitle}</p>
                </div>

                <form onSubmit={handleAdminVerify} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t.auth.adminVerify.codeLabel}</label>
                    <Input
                      placeholder="000000"
                      value={adminCode}
                      onChange={(e) => { setAdminCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setAdminVerifyError(""); }}
                      className="bg-background border-border text-foreground h-14 rounded-xl focus-visible:ring-primary text-center text-2xl tracking-[0.5em] font-mono"
                      maxLength={6}
                      autoFocus
                      data-testid="input-admin-code"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || adminCode.length !== 6}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium"
                    data-testid="button-admin-verify"
                  >
                    {submitting ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" />{t.auth.adminVerify.verifying}</>) : t.auth.adminVerify.verifyButton}
                  </Button>
                  <InlineError message={adminVerifyError} />
                </form>

                <div className="text-center">
                  <button
                    onClick={handleAdminResend}
                    disabled={resending}
                    className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    data-testid="button-admin-resend"
                  >
                    {resending ? t.auth.adminVerify.resending : `${t.auth.adminVerify.didntReceive} ${t.auth.adminVerify.resendCode}`}
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
