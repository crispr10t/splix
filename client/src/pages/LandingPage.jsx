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
            <h1 id="hero-title">Shared bills, settled together.</h1>
            <p className="hero-lede">
              Create a group, add expenses, and share balances. No account needed.
            </p>
            <p className="hero-note">Works for trips, homes, dinners, and the plans in between.</p>
          </div>
          <div className="hero-after">
            <a className="text-link" href="#how-it-works">
              See how Splix works <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>
        <div className="creator" id="create-group">
          <CreateGroupCard isDialog={false} />
        </div>
      </section>

      <section className="steps-band" id="how-it-works" aria-labelledby="steps-title">
        <div className="container steps-content">
          <div className="steps-heading">
            <h2 id="steps-title">From first bill to final balance</h2>
            <p>Keep the group moving without doing the math in chat.</p>
          </div>
          <ol className="steps-list">
            {steps.map(({ icon: Icon, title, detail }) => (
              <li className="step-row" key={title}>
                <Icon className="step-icon" aria-hidden="true" size={20} />
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
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
