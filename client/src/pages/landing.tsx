import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Hexagon, Sparkles, ArrowRight, Layers, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video 
          src="/hero-background.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-60 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 neon-border">
            <Hexagon className="w-6 h-6 text-white fill-white/20" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white text-glow">
            Craflect
          </span>
        </div>
        <div>
          <Button 
            className="rounded-full px-8 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all hover:scale-105"
            onClick={() => window.location.href = "/api/login"}
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-primary mb-8 border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>The AI Content Intelligence Platform</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Transform Ideas Into <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary">
              Infinite Content
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Ingest your raw materials, extract the gold, and generate months of high-performing social content automatically with our Repurposing Engine.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              className="w-full sm:w-auto rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 neon-border transition-all hover:-translate-y-1"
              onClick={() => window.location.href = "/api/login"}
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="w-full sm:w-auto rounded-full px-10 h-14 bg-white/5 border-white/10 hover:bg-white/10 text-white backdrop-blur-md transition-all"
            >
              View Demo
            </Button>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24"
        >
          {[
            { icon: Layers, title: "Deep Ingestion", desc: "Upload videos, podcasts, or text. We analyze every detail." },
            { icon: Workflow, title: "Repurposing Engine", desc: "Generate hooks, scripts, and posts adapted for every platform." },
            { icon: Zap, title: "Daily Briefs", desc: "Wake up to curated content ideas based on your unique data." }
          ].map((feature, i) => (
            <div key={i} className="glass-card p-8 rounded-2xl text-left flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
