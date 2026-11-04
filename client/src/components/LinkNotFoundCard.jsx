import { Link } from "react-router-dom";

export function LinkNotFoundCard({ title = "Group not found", message = "This link is invalid, expired, or no longer available." }) {
  return (
    <section className="reveal reveal-2 mx-auto max-w-md rounded-2xl border border-ink-900/12 bg-white/90 p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-ink-900 sm:text-lg">{title}</h2>
      <p className="mt-1 text-xs text-ink-700 sm:text-sm">{message}</p>
      <Link className="btn-primary mt-4 px-4 py-2 text-xs sm:text-sm" to="/">
        Go to home
      </Link>
    </section>
  );
}
