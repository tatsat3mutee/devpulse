import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function SettingsPage() {
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-gray-500 text-sm mb-6">System configuration and status</p>

      <div className="space-y-6">
        {/* Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-3">System Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Backend</span>
              <span className={health ? "text-green-600" : "text-red-500"}>
                {health ? "● Connected" : "● Disconnected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Check</span>
              <span className="text-gray-700">
                {health ? new Date(health.timestamp).toLocaleTimeString() : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fetch Interval</span>
              <span className="text-gray-700">60 min (cron)</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-3">About</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            AI Pulse aggregates AI/ML news from 7+ platforms — arXiv, GitHub, Reddit,
            Hacker News, Hugging Face, X, and LinkedIn. Items are scored by engagement + recency,
            classified into topics via LLM or keyword fallback, and optionally summarized.
          </p>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-3">API Keys (configured in .env)</h2>
          <div className="space-y-1.5 text-sm">
            {["GROQ_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "GITHUB_TOKEN", "TWITTER_BEARER_TOKEN"].map(k => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-500 font-mono text-xs">{k}</span>
                <span className="text-gray-400 text-xs">Set in backend .env</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
