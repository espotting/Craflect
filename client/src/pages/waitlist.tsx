import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Lock,
} from "lucide-react";
import logoNew from "@/assets/Craflect_Logo_new_Transparent.png";

interface WaitlistStats {
  count: number;
}

const MACRO_CATEGORIES = [
  {
    id: 'finance_business',
    label: 'Finance & Business',
    emoji: '💰',
    desc: 'Money, investing, entrepreneurship',
    niches: [
      { value: 'finance', label: 'Finance' },
      { value: 'crypto', label: 'Crypto' },
      { value: 'real_estate', label: 'Real Estate' },
      { value: 'online_business', label: 'Online Business' },
      { value: 'side_hustle', label: 'Side Hustle' },
      { value: 'personal_finance', label: 'Personal Finance' },
    ],
  },
  {
    id: 'tech_ai',
    label: 'Tech & AI',
    emoji: '🤖',
    desc: 'AI tools, software, productivity',
    niches: [
      { value: 'ai_tools', label: 'AI Tools' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'digital_marketing', label: 'Digital Marketing' },
    ],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    emoji: '🌿',
    desc: 'Health, fitness, mindset, relationships',
    niches: [
      { value: 'fitness', label: 'Fitness' },
      { value: 'health_wellness', label: 'Health & Wellness' },
      { value: 'mindset', label: 'Mindset' },
      { value: 'relationships', label: 'Relationships' },
      { value: 'self_improvement', label: 'Self-Improvement' },
    ],
  },
  {
    id: 'content_education',
    label: 'Content & Education',
    emoji: '🎬',
    desc: 'Creators, education, food, travel',
    niches: [
      { value: 'content_creation', label: 'Content Creation' },
      { value: 'education', label: 'Education' },
      { value: 'cooking_food', label: 'Cooking & Food' },
      { value: 'travel', label: 'Travel' },
      { value: 'parenting', label: 'Parenting' },
      { value: 'fashion_style', label: 'Fashion & Style' },
    ],
  },
];

export default function WaitlistPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [niche, setNiche] = useState("");
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);
  const [platform, setPlatform] = useState("");
  const [followersRange, setFollowersRange] = useState("");
  const [contentGoal, setContentGoal] = useState("");
  const [why, setWhy] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: stats } = useQuery<WaitlistStats>({
    queryKey: ["/api/waitlist/stats"],
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/waitlist/join", {
        firstName,
        email,
        niche,
        why,
        platform,
        followersRange,
        contentGoal: contentGoal || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("409") || msg.includes("already")) {
        toast({
          title: "Already on the list",
          description: "This email is already registered.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const canSubmit = firstName.trim() && email.trim() && niche && platform;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#080B14] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div
          className={`relative text-center max-w-md mx-auto transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">You're in.</h2>
          <p className="text-slate-400 text-lg mb-2">
            Welcome to the Craflect early access list, {firstName}.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            We'll review your application and send you an invitation when your spot is ready. Keep creating.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Confirmation sent to {email}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white font-bold text-lg tracking-tight"
        >
          <img src={logoNew} alt="Craflect" className="h-10 w-auto object-contain" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
          <Lock className="w-3 h-3 text-purple-400" />
          Early Access Only
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — Value prop */}
          <div className={`transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {stats?.count ? `${stats.count} creators on the waitlist` : "Founding Member Access"}
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              Know what goes viral.
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Before you post.
              </span>
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Craflect analyzes thousands of viral videos to predict what content will perform in your niche — before you film a single second.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: BarChart3, value: "6K+",  label: "TikTok videos analyzed" },
                { icon: TrendingUp, value: "20",   label: "Niches tracked" },
                { icon: Sparkles,   value: "72h",  label: "Signal cycle" },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 text-center">
                  <stat.icon className="w-4 h-4 text-purple-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-lg">{stat.value}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {["A", "B", "C", "D"].map((l, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 border-2 border-[#080B14] flex items-center justify-center text-white text-[10px] font-bold"
                  >
                    {l}
                  </div>
                ))}
              </div>
              <span>Founding members get <span className="text-purple-400 font-medium">lifetime 50% discount</span></span>
            </div>
          </div>

          {/* Right — Form */}
          <div className={`transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}>
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-800 p-8 shadow-2xl shadow-black/50">

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Request Early Access</h2>
                <p className="text-slate-400 text-sm">We review every application personally.</p>
              </div>

              <div className="space-y-4">
                {/* First name */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                    First Name
                  </label>
                  <Input
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-purple-500 transition-colors"
                    data-testid="input-waitlist-firstname"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-purple-500 transition-colors"
                    data-testid="input-waitlist-email"
                  />
                </div>

                {/* Niche */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Your Main Niche
                  </label>

                  {/* Step 1 — 4 macro-categories */}
                  {!selectedMacro && (
                    <div className="grid grid-cols-2 gap-2">
                      {MACRO_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedMacro(cat.id)}
                          className="p-3 rounded-xl border text-left transition-all bg-slate-800/50 border-slate-700 hover:border-purple-500/50 hover:bg-purple-500/5"
                        >
                          <div className="text-xl mb-1">{cat.emoji}</div>
                          <div className="text-sm font-semibold text-white mb-0.5">{cat.label}</div>
                          <div className="text-xs text-slate-500">{cat.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Step 2 — Niches within chosen macro */}
                  {selectedMacro && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{MACRO_CATEGORIES.find(c => c.id === selectedMacro)?.emoji}</span>
                          <span className="text-sm font-semibold text-white">
                            {MACRO_CATEGORIES.find(c => c.id === selectedMacro)?.label}
                          </span>
                        </div>
                        <button
                          onClick={() => { setSelectedMacro(null); setNiche(''); }}
                          className="text-xs text-slate-500 hover:text-purple-400 transition-colors"
                        >
                          ← Change
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {MACRO_CATEGORIES.find(c => c.id === selectedMacro)?.niches.map(n => (
                          <button
                            key={n.value}
                            onClick={() => setNiche(n.value)}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                              niche === n.value
                                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                            data-testid={`niche-${n.value}`}
                          >
                            {niche === n.value && <span className="mr-1.5">✓</span>}
                            {n.label}
                          </button>
                        ))}
                      </div>
                      {niche && (
                        <div className="mt-2">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{background:'rgba(124,92,255,0.1)',border:'1px solid rgba(124,92,255,0.2)',color:'#a78bfa'}}>
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            Selected: {MACRO_CATEGORIES.find(c => c.id === selectedMacro)?.niches.find(n2 => n2.value === niche)?.label}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Platform */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Your Main Platform
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "tiktok", label: "TikTok" },
                      { value: "instagram", label: "Instagram" },
                      { value: "youtube", label: "YouTube Shorts" },
                      { value: "multi", label: "Multi-platform" },
                    ].map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPlatform(p.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                          platform === p.value
                            ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Followers range */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Followers Count
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["0–1K", "1K–10K", "10K–100K", "100K+"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setFollowersRange(r)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${
                          followersRange === r
                            ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content goal */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Main Goal <span className="text-slate-600 normal-case">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "grow_faster", label: "Grow faster" },
                      { value: "go_viral", label: "Go viral" },
                      { value: "save_time", label: "Save time" },
                      { value: "understand_trends", label: "Understand trends" },
                    ].map((g) => (
                      <button
                        key={g.value}
                        onClick={() => setContentGoal(contentGoal === g.value ? "" : g.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                          contentGoal === g.value
                            ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={!canSubmit || joinMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white h-12 font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition-all"
                  data-testid="button-waitlist-submit"
                >
                  {joinMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Request Access
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-slate-600 text-xs">
                  No spam. No sharing. Just an invite when your spot is ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
