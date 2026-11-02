import { ArrowRight, Check, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export default function NewsletterSignup() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <section className="newsletter-section" aria-labelledby="newsletter-heading">
      <div className="newsletter-copy">
        <p className="newsletter-eyebrow">
          <Mail aria-hidden="true" />A NOTE FROM AL SERA
        </p>
        <h2 id="newsletter-heading">
          Good things,
          <br />
          <em>worth opening.</em>
        </h2>
        <p>Occasional notes on considered finds, thoughtful living, and what is new.</p>
      </div>

      <div className="newsletter-form-wrap">
        {isSubmitted ? (
          <div className="newsletter-success" role="status" aria-live="polite">
            <span className="newsletter-success-icon" aria-hidden="true">
              <Check />
            </span>
            <span>
              <strong>Thanks for your interest.</strong>
              <small>Subscriptions are not connected in this preview.</small>
            </span>
          </div>
        ) : (
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Your email address"
              required
            />
            <button type="submit" aria-label="Subscribe to AlSera newsletter">
              <span>Subscribe</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
        )}
        <p className="newsletter-note">
          Preview only — no email is collected or stored. By subscribing, you agree to our{' '}
          <a href="/policies/privacy">privacy policy</a>.
        </p>
      </div>
      <span className="newsletter-orbit newsletter-orbit--one" aria-hidden="true" />
      <span className="newsletter-orbit newsletter-orbit--two" aria-hidden="true" />
    </section>
  );
}
