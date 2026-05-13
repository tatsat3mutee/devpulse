import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export type DevRole = "developer" | "pm" | "designer" | "qa";

const STORAGE_KEY = "devpulse:role";

export function useRole() {
  const [role, setRoleState] = useState<DevRole | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as DevRole) || null;
  });

  const setRole = (r: DevRole) => {
    localStorage.setItem(STORAGE_KEY, r);
    setRoleState(r);
  };

  return { role, setRole };
}

const ROLES: { value: DevRole; label: string; icon: string; description: string }[] = [
  {
    value: "developer",
    label: "Developer",
    icon: "👨‍💻",
    description: "Model APIs, coding tools, arXiv papers with code, trending repos",
  },
  {
    value: "pm",
    label: "Product Manager",
    icon: "📋",
    description: "Model releases, benchmarks, competitor launches, enterprise AI",
  },
  {
    value: "designer",
    label: "Designer",
    icon: "🎨",
    description: "AI design tools, v0/Lovable, multimodal models, UI patterns",
  },
  {
    value: "qa",
    label: "QA / Test Engineer",
    icon: "🧪",
    description: "LLM evals, prompt injection, testing frameworks, hallucination research",
  },
];

interface RoleSelectorProps {
  onClose: () => void;
}

export default function RoleSelector({ onClose }: RoleSelectorProps) {
  const { role, setRole } = useRole();
  const { user } = useAuth();

  const handleSelect = async (r: DevRole) => {
    setRole(r);
    if (user) {
      api.updateRole(r).catch(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface border border-line rounded-xl shadow-card w-full max-w-lg">
        <div className="px-6 pt-6 pb-5 border-b border-line">
          <div className="eyebrow mb-1">Personalise your feed</div>
          <h2 className="font-semibold text-ink text-[18px] leading-snug">What's your role?</h2>
          <p className="text-[13px] text-ink-muted mt-1">
            We'll highlight the topics most relevant to you. You can change this anytime.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLES.map(({ value, label, icon, description }) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className={`text-left px-4 py-3.5 rounded-lg border transition-all ${
                role === value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line hover:border-ink/25 hover:bg-paper text-ink-soft hover:text-ink"
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-[18px]">{icon}</span>
                <span className="font-medium text-[13.5px]">{label}</span>
              </div>
              <p className="text-[12px] text-ink-muted leading-relaxed">{description}</p>
            </button>
          ))}
        </div>

        <div className="px-6 pb-5 pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="text-[12px] text-ink-faint hover:text-ink-muted transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

/** Wrapper - shows the modal once on first visit (no role stored), then never again unless user reopens */
export function RoleSelectorGate() {
  const { role } = useRole();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Delay slightly so it doesn't flash on load
    const t = setTimeout(() => {
      if (!role) setShow(true);
    }, 800);
    return () => clearTimeout(t);
  }, [role]);

  if (!show) return null;
  return <RoleSelector onClose={() => setShow(false)} />;
}
