import { ArrowRight, Link2, Receipt, Wallet } from "lucide-react";
import { CreateGroupCard } from "../components/CreateGroupCard";

const steps = [
  {
    icon: Receipt,
    title: "Record shared bills",
    detail: "Add an expense, choose who paid, and split it evenly or by amount."
  },
  {
    icon: Link2,
    title: "Share the right link",
    detail: "Share the view-only link with everyone. Keep the PIN-protected edit link for yourself."
  },
  {
    icon: Wallet,
    title: "Settle the balance",
    detail: "See who owes whom, then pay with a UPI link or QR code."
  }
];

export function LandingPage() {
  return (
    <main className="site-main" id="main">
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-aside">
          <div className="hero-copy">
            <h1 id="hero-title" className="animate-fade-up">
              Shared bills,{" "}
              <span className="text-leaf-700 underline decoration-leaf-300 underline-offset-4 decoration-2">
                settled
              </span>{" "}
              together.
            </h1>
            <p className="hero-lede animate-fade-up [animation-delay:60ms]">
              Create a group, add expenses, and share balances. No account needed.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2.5 select-none pointer-events-none animate-fade-up [animation-delay:120ms]">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-leaf-100/70 text-leaf-800 border border-leaf-200/60 font-sans">
                Free
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-leaf-100/70 text-leaf-800 border border-leaf-200/60 font-sans">
                No sign-up
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-leaf-100/70 text-leaf-800 border border-leaf-200/60 font-sans">
                Works with a link
              </span>
            </div>
            <p className="hero-note animate-fade-up [animation-delay:160ms]">
              Works for trips, homes, dinners, and the plans in between.
            </p>
          </div>
          <div className="hero-after">
            <a className="text-link" href="#how-it-works">
              See how Splix works <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>
        <div className="creator animate-fade-up [animation-delay:100ms]" id="create-group">
          <CreateGroupCard isDialog={false} />
        </div>
      </section>

      <section className="steps-band" id="how-it-works" aria-labelledby="steps-title">
        <div className="container steps-content">
          <div className="steps-heading">
            <h2 id="steps-title">From first bill to final balance</h2>
            <p>Keep the group moving without doing the math in chat.</p>
          </div>
          <ol className="timeline-list">
            {steps.map(({ icon: Icon, title, detail }, index) => (
              <li className="timeline-item" key={title}>
                <div className="timeline-node" aria-hidden="true">
                  0{index + 1}
                </div>
                <div className="timeline-body">
                  <div className="timeline-header">
                    <Icon className="timeline-icon" aria-hidden="true" size={18} />
                    <h3 className="timeline-title">{title}</h3>
                  </div>
                  <p className="timeline-detail">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="closing-cta" aria-labelledby="cta-title">
        <div className="container closing-cta-content">
          <h2 id="cta-title">Ready to split?</h2>
          <p>Start your group in seconds. No apps, no accounts, no headaches.</p>
          <a
            className="closing-cta-btn"
            href="#create-group"
            onClick={(e) => {
              e.preventDefault();
              const target = document.getElementById("create-group");
              target?.scrollIntoView({ behavior: "smooth" });
              const input = target?.querySelector("input");
              input?.focus({ preventScroll: true });
            }}
          >
            Create a group <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>
      </section>

      <footer className="site-footer container">
        <span>Shared expenses, clear balances, no sign-up.</span>
        <a href="https://www.linkedin.com/in/piyushagr24" rel="noreferrer" target="_blank">
          Made by Piyush Agrawal
        </a>
      </footer>
    </main>
  );
}
