import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Sparkles, ArrowRight, Eye, Brain, Target, Pencil, Sun, Moon, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import logoLight from "@/assets/logo-light.png";
import logoTransparent from "@/assets/logo-transparent.png";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0">
        <video 
          src="/hero-background.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-40 dark:opacity-60 dark:mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      <nav className="relative z-10 w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-8 w-auto object-contain" data-testid="logo-landing" />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 text-foreground backdrop-blur-md transition-all border border-border dark:border-white/10"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="button-theme-toggle-landing"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setLocation("/auth?mode=login")}
            className="p-2.5 rounded-full bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 text-foreground backdrop-blur-md transition-all border border-border dark:border-white/10"
            title="Log in"
            data-testid="button-login-nav"
          >
            <UserCircle2 className="w-5 h-5" />
          </button>
          <Button 
            className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20 transition-all hover:scale-105 font-medium"
            onClick={() => setLocation("/auth")}
            data-testid="button-signin-nav"
          >
            Sign up
          </Button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-primary mb-8 border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>Content Performance Intelligence</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Show me what works <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary">
              Tell me what to post
            </span>
            <br className="hidden md:block" />
            Create it for me
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Craflect analyzes content performance in your niche and generates optimized content to reproduce what works.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              className="w-full sm:w-auto rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 neon-border transition-all hover:-translate-y-1 gap-3"
              onClick={() => setLocation("/auth")}
              data-testid="button-get-started"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mt-24"
        >
          {[
            { icon: Eye, title: "Observe", desc: "Paste any video URL. We extract performance data, hooks, and structure automatically." },
            { icon: Brain, title: "Understand", desc: "AI identifies winning patterns, top hooks, and formats that drive engagement in your niche." },
            { icon: Target, title: "Recommend", desc: "Get actionable insights and data-backed recommendations for your next content." },
            { icon: Pencil, title: "Produce", desc: "Generate optimized scripts, hooks, and posts based on proven performance patterns." }
          ].map((feature, i) => (
            <div key={i} className="glass-card p-8 rounded-2xl text-left flex flex-col items-start" data-testid={`card-feature-${i}`}>
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
