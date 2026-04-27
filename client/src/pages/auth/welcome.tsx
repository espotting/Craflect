import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { FcGoogle } from "react-icons/fc";
import logoNew from "@/assets/Craflect_Logo_new_Transparent.png";

export default function AuthWelcome() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation((user as any)?.isAdmin ? "/system/founder" : "/home");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <header className="p-6">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2" data-testid="link-back-home">
          <img src={logoNew} alt="Craflect" className="h-10 w-auto object-contain" />
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8"
          >
            <Sparkles className="w-8 h-8 text-violet-500" />
          </motion.div>

          <h1 className="text-4xl font-bold text-white mb-4" data-testid="text-welcome-title">
            Welcome to Craflect
          </h1>
          <p className="text-gray-400 text-lg mb-8" data-testid="text-welcome-subtitle">
            Discover viral trends before they explode. Get started for free in seconds.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <a
              href="/api/login"
              className="w-full h-14 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl border-0 transition-all mb-4 flex items-center justify-center"
              data-testid="button-google-auth"
            >
              <FcGoogle className="w-5 h-5 mr-3" />
              Continue with Google
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative my-6"
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0a0a0f] text-gray-500">OR</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="outline"
              className="w-full h-14 border-gray-700 text-white hover:bg-gray-800 font-medium rounded-xl transition-all mb-6"
              onClick={() => setLocation("/signup")}
              data-testid="button-email-auth"
            >
              <Mail className="w-5 h-5 mr-3" />
              Get started with Email
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-400"
          >
            Already have an account?{" "}
            <Link to="/signin" className="text-violet-400 hover:text-violet-300 font-medium transition-colors" data-testid="link-go-login">
              Log in
            </Link>
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
