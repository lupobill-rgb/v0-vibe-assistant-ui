import { useState, useEffect } from 'react';
import { fetchHealth, type HealthStatus } from '../api/client';

const llmProviders = [
  { id: 'openai', label: 'OpenAI GPT-4', envKey: 'OPENAI_API_KEY' },
  { id: 'anthropic', label: 'Anthropic Claude', envKey: 'ANTHROPIC_API_KEY' },
  { id: 'gemini', label: 'Google Gemini', envKey: 'GOOGLE_API_KEY' },
];

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [selectedLLM, setSelectedLLM] = useState(
    () => localStorage.getItem('vibe_llm_provider') || 'openai'
  );
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('vibe_llm_model') || ''
  );

  useEffect(() => {
    (async () => {
      const status = await fetchHealth();
      setHealth(status);
    })();
  }, []);

  const saveLLM = (provider: string) => {
    setSelectedLLM(provider);
    localStorage.setItem('vibe_llm_provider', provider);
  };

  const saveModel = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('vibe_llm_model', model);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">
        <span className="bg-gradient-to-r from-vibe-blue via-vibe-purple to-vibe-pink bg-clip-text text-transparent">
          Settings
        </span>
      </h1>

      {/* LLM Provider */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">LLM Provider</h2>
        <div className="space-y-2">
          {llmProviders.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                selectedLLM === p.id
                  ? 'bg-gradient-to-r from-vibe-blue/20 to-vibe-purple/20 border border-white/10'
                  : 'hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="llm"
                value={p.id}
                checked={selectedLLM === p.id}
                onChange={() => saveLLM(p.id)}
                className="accent-vibe-blue"
              />
              <div>
                <p className="text-sm text-white font-medium">{p.label}</p>
                <p className="text-xs text-white/30">Env: {p.envKey}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Model Override */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Model Override</h2>
        <input
          type="text"
          value={selectedModel}
          onChange={(e) => saveModel(e.target.value)}
          placeholder="Leave blank for default model"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-vibe-blue/50 transition-colors text-sm"
        />
        <p className="text-xs text-white/30 mt-2">
          e.g. gpt-4-turbo-preview, claude-sonnet-4-5-20250929, gemini-pro
        </p>
      </div>

      {/* API Health */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">API Status</h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              health?.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span className="text-sm text-white/80">
            {health ? `API is ${health.status}` : 'Unable to reach API'}
          </span>
          {health && (
            <span className="text-xs text-white/30 ml-auto">
              {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* User session */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Account</h2>
        {localStorage.getItem('vibe_token') ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">
              Signed in as {JSON.parse(localStorage.getItem('vibe_user') || '{}').email || 'unknown'}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('vibe_token');
                localStorage.removeItem('vibe_user');
                window.location.reload();
              }}
              className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <p className="text-sm text-white/40">Not signed in. Authentication is optional.</p>
        )}
      </div>
    </div>
  );
}
