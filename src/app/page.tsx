import Link from 'next/link'

export default function Home() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            Win Your Stripe Chargebacks
          </h1>
          <p className="hero-subtitle">
            AI-generated dispute responses in seconds. Connect your Stripe account, 
            and let DisputeKit help you win back lost revenue.
          </p>
          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Start Free Trial
            </Link>
            <span className="hero-pricing">$49/month after trial</span>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="features-grid">
            <div className="feature-card card">
              <div className="feature-number">1</div>
              <h3>Connect Stripe</h3>
              <p>Link your Stripe account with one click. We securely access your dispute data.</p>
            </div>
            <div className="feature-card card">
              <div className="feature-number">2</div>
              <h3>View Disputes</h3>
              <p>See all your chargebacks in one dashboard with full details and deadlines.</p>
            </div>
            <div className="feature-card card">
              <div className="feature-number">3</div>
              <h3>Generate Response</h3>
              <p>Our AI analyzes your case and generates a winning dispute response in seconds.</p>
            </div>
            <div className="feature-card card">
              <div className="feature-number">4</div>
              <h3>Submit & Win</h3>
              <p>Review, edit if needed, and submit directly to Stripe. Track your win rate over time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing">
        <div className="container">
          <h2 className="section-title">Simple Pricing</h2>
          <div className="pricing-card card">
            <h3>Pro</h3>
            <div className="price">$49<span>/month</span></div>
            <ul className="pricing-features">
              <li>✓ Unlimited disputes</li>
              <li>✓ AI-generated responses</li>
              <li>✓ Direct Stripe submission</li>
              <li>✓ Win rate analytics</li>
              <li>✓ 14-day free trial</li>
            </ul>
            <Link href="/signup" className="btn btn-primary">
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}