import { Btn } from '../components/ui';
import { Icon } from '../components/Icon';
import { formatINR } from '../lib/quoteEngine';

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <header className="landing-top">
        <div className="brand-inline">
          <span className="brand-mark">
            <Icon name="truck" size={20} />
          </span>
          <strong>QuoteMitra</strong>
        </div>
        <Btn variant="secondary" onClick={onEnter} icon="arrowRight">
          Open the app
        </Btn>
      </header>

      <section className="hero">
        <p className="kicker">Built for India's small freight brokers</p>
        <h1>
          The first reply wins the load.
          <span>Send yours in under a minute.</span>
        </h1>
        <p className="lede">
          QuoteMitra reads a load enquiry on WhatsApp and drafts a freight
          quote from your own lane history — fuel, toll, driver bata and your
          margin, all shown line by line. You check it, tap send, and get back
          to the next call.
        </p>
        <div className="hero-cta">
          <Btn onClick={onEnter} icon="send">
            Try the live demo
          </Btn>
          <span className="hero-note">No sign-up. Your data stays in your browser.</span>
        </div>
        <div className="hero-quote-card">
          <div className="hq-head">
            <Icon name="chat" size={16} />
            <span>Bokaro → Dhanbad · 5T · urgent</span>
          </div>
          <div className="hq-rows">
            <div><span>Diesel &amp; running</span><strong>{formatINR(552)}</strong></div>
            <div><span>Toll (FASTag)</span><strong>{formatINR(120)}</strong></div>
            <div><span>Driver bata</span><strong>{formatINR(800)}</strong></div>
            <div><span>Loading / unloading</span><strong>{formatINR(800)}</strong></div>
            <div className="hq-total"><span>Quote to customer</span><strong>{formatINR(3400)}</strong></div>
          </div>
          <p className="hq-foot">Drafted from 14 past trips on this lane · you earned {formatINR(395)} margin</p>
        </div>
      </section>

      <section className="steps">
        <h2>How it works</h2>
        <div className="steps-grid">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Enquiry lands on WhatsApp</h3>
            <p>
              "5 ton TMT, Bokaro se Dhanbad, kal subah." QuoteMitra picks out
              the lane, weight and urgency from the message — no typing.
            </p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>A quote is drafted instantly</h3>
            <p>
              Your past rates on that lane, adjusted for today's diesel price,
              blended with the real trip cost. The full maths is on screen —
              nothing hidden.
            </p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>You check, tap send</h3>
            <p>
              Tweak the rate or margin if you want, then send it back on
              WhatsApp. Every quote is logged with its margin, won or lost.
            </p>
          </div>
        </div>
      </section>

      <section className="pricing-teaser">
        <div className="pricing-card">
          <h2>Pay only when you win</h2>
          <p>
            No monthly fee to start. QuoteMitra is free while you try it —
            later, a small fee applies only on loads you actually win. If it
            doesn't earn, it doesn't cost.
          </p>
          <div className="pricing-line">
            <strong>Free</strong>
            <span>to start · unlimited quotes</span>
          </div>
        </div>
      </section>

      <footer className="landing-foot">
        <div className="brand-inline">
          <span className="brand-mark">
            <Icon name="truck" size={16} />
          </span>
          <strong>QuoteMitra</strong>
        </div>
        <p>
          Made for the brokers who keep India's freight moving — one quote at a
          time. Demo build · WhatsApp integration connects in Phase 2.
        </p>
      </footer>
    </div>
  );
}
