// Landing — the public face. Fraunces display type does the heavy lifting,
// mono figures everywhere a rupee appears, hairlines instead of cards.

import { Btn, Money, StackedBar } from '../components/ui';
import { Icon } from '../components/Icon';
import { formatINR } from '../lib/quoteEngine';

const RATE_STRIP: Array<[string, number]> = [
  ['Bokaro → Dhanbad', 3400],
  ['Bokaro → Ranchi', 7300],
  ['Bokaro → Jamshedpur', 9800],
  ['Bokaro → Durgapur', 12900],
  ['Bokaro → Patna', 18200],
  ['Dhanbad → Kolkata', 23500],
];

const SAMPLE_BREAKDOWN = {
  fuel: 552,
  toll: 120,
  driverBata: 800,
  handling: 800,
  operatingCost: 2272,
  marginPct: 13,
  marginRs: 395,
  urgencyMultiplier: 1.1,
  historyRate: 3200,
  finalRate: 3400,
};

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <header className="landing-top">
        <div className="brand-inline">
          <span className="brand-mark">
            <Icon name="truck" size={18} />
          </span>
          <strong>QuoteMitra</strong>
        </div>
        <Btn variant="ghost" onClick={onEnter} icon="arrowR">
          Open the app
        </Btn>
      </header>

      <section className="hero">
        <p className="kicker">WhatsApp-native freight quoting · for India's small brokers</p>
        <h1>
          The first reply <em>wins the load.</em>
          <span>Send yours in under a minute.</span>
        </h1>
        <p className="lede">
          A load enquiry lands on WhatsApp. QuoteMitra drafts the freight quote
          from your own lane history — diesel, toll, driver bata, your margin,
          line by line. You check it, tap send, get back to the next call.
        </p>
        <div className="hero-cta">
          <Btn onClick={onEnter} icon="send">
            Try the live demo
          </Btn>
          <span className="hero-note">No sign-up · runs in your browser</span>
        </div>
      </section>

      <div className="rate-strip" aria-label="Typical lane rates">
        {RATE_STRIP.map(([lane, rate]) => (
          <span key={lane} className="rate-strip-item">
            <span className="rate-strip-lane">{lane}</span>
            <Money value={rate} />
          </span>
        ))}
      </div>

      <section className="landing-section">
        <div className="landing-inner">
          <h2>
            The anatomy of a <em>₹3,400</em> quote
          </h2>
          <p className="lede">
            Bokaro → Dhanbad, 5 ton TMT bars, needed tomorrow morning. Every
            rupee accounted for — nothing hidden from you, nothing padded for
            the customer.
          </p>
          <div className="anatomy">
            <StackedBar breakdown={SAMPLE_BREAKDOWN} />
            <dl className="anatomy-rows">
              <div>
                <dt>Trip cost</dt>
                <dd><Money value={2272} /></dd>
              </div>
              <div>
                <dt>Your margin · 13%</dt>
                <dd><Money value={395} className="sage-num" prefix="+" /></dd>
              </div>
              <div>
                <dt>Urgency · kal subah ×1.1</dt>
                <dd className="muted">included</dd>
              </div>
              <div className="anatomy-total">
                <dt>Quote to customer</dt>
                <dd><Money value={3400} /></dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="landing-section alt">
        <div className="landing-inner">
          <h2>
            How it <em>works</em>
          </h2>
          <ol className="steps">
            <li>
              <span className="step-num">01</span>
              <div>
                <h3>Enquiry lands on WhatsApp</h3>
                <p>
                  “Bhai, 5 ton TMT bars Bokaro se Dhanbad kal subah chahiye.
                  14ft chalega. Rate batao jaldi.” QuoteMitra reads the lane,
                  weight and urgency out of the message — you type nothing.
                </p>
              </div>
            </li>
            <li>
              <span className="step-num">02</span>
              <div>
                <h3>A quote is drafted instantly</h3>
                <p>
                  Your past rates on that lane, drifted for today's diesel
                  price, blended with the real trip cost. The full maths is on
                  screen before anything goes out.
                </p>
              </div>
            </li>
            <li>
              <span className="step-num">03</span>
              <div>
                <h3>You check, tap send</h3>
                <p>
                  Tweak the rate or the margin if you want, then send it back
                  on WhatsApp. Every quote is logged with its margin — won or
                  lost.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-inner">
          <h2>
            Sounds like <em>your</em> WhatsApp
          </h2>
          <div className="wa-sample">
            <div className="wa-msg in">
              <p>Bhai, 5 ton TMT bars Bokaro se Dhanbad kal subah chahiye. 14ft chalega. Rate batao jaldi.</p>
              <span>Ramesh Agarwal · 9:12 AM</span>
            </div>
            <div className="wa-msg out">
              <p>Namaste Ramesh ji, Bokaro se Dhanbad ke liye hamara rate <span className="inr">{formatINR(3400)}</span> rahega (14ft Eicher, 5T). Gaadi turant available hai. Confirm karein? — Sharma Roadlines</p>
              <span>sent in 47 seconds · margin {formatINR(395)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing">
        <div className="landing-inner">
          <h2>
            Pay only when <em>you win</em>
          </h2>
          <p className="lede">
            No monthly fee to start. Later, a small fee applies only on loads
            you actually win. If it doesn't earn, it doesn't cost.
          </p>
          <p className="pricing-line">
            <Money value={0} /> <span>to start · unlimited quotes</span>
          </p>
        </div>
      </section>

      <footer className="landing-foot">
        <div className="brand-inline">
          <span className="brand-mark">
            <Icon name="truck" size={14} />
          </span>
          <strong>QuoteMitra</strong>
        </div>
        <p>
          Made for the brokers who keep India's freight moving — one quote at
          a time. Demo build; WhatsApp Cloud API connects in Phase 2.
        </p>
      </footer>
    </div>
  );
}
