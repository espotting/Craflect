              </span>
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Craflect analyzes thousands of viral videos to predict what content will perform in your niche — before you film a single second.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: BarChart3, value: "50K+", label: "Videos analyzed" },
                { icon: TrendingUp, value: "87%", label: "Prediction accuracy" },
                { icon: Sparkles, value: "5", label: "Niches covered" },
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
                  <div className="grid grid-cols-2 gap-2">
                    {NICHES.map((n) => (
                      <button
                        key={n.value}
                        onClick={() => setNiche(n.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                          niche === n.value
                            ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                        data-testid={`niche-${n.value}`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Why */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Why Craflect? <span className="text-slate-600 normal-case">(optional)</span>
                  </label>
                  <textarea
                    placeholder="I want to stop guessing what to post..."
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
                    data-testid="textarea-waitlist-why"
                  />
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
