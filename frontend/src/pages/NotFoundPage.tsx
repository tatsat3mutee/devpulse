import { Link } from "react-router-dom";
import Icon from "../components/Icon";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4">
      <div className="text-[48px] sm:text-[64px] font-mono text-ink-faint mb-4 select-none">404</div>
      <h1 className="display text-[28px] sm:text-[34px] text-ink mb-3">
        Page not found
      </h1>
      <p className="text-[14px] text-ink-muted max-w-sm mb-8 leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft transition-colors"
      >
        <Icon name="home" size={14} />
        Back to Today
      </Link>
    </div>
  );
}
