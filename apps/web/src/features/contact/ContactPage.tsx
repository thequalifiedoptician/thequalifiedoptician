import { useMemo, type CSSProperties } from 'react';
import { ArrowUpRight, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import { useSocialSettings } from '@/features/social/socialSettingsContext';
import { getSocialLinks } from '@/features/social/socialLinks';
import './contact-page.css';

function validEmail(value: string): string {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ? email : '';
}

function safeMapsUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export default function ContactPage() {
  const { settings: brand, isLoading: isBrandLoading, error: brandError } = useBrandSettings();
  const { settings: socialSettings, isLoading: isSocialLoading, error: socialError } =
    useSocialSettings();
  const socialLinks = useMemo(() => getSocialLinks(socialSettings), [socialSettings]);
  const email =
    validEmail(brand.support_email) ||
    validEmail(brand.company_email) ||
    (socialSettings?.enable_email ? validEmail(socialSettings.email) : '');
  const phone = brand.company_phone.trim() || socialSettings?.support_phone.trim() || '';
  const phoneDigits = phone.replace(/\D/gu, '');
  const phoneHref = `${phone.trim().startsWith('+') ? '+' : ''}${phoneDigits}`;
  const whatsapp = socialLinks.find((link) => link.key === 'whatsapp');
  const companyLocation = [
    brand.company_address,
    brand.company_city,
    brand.postal_code,
    brand.company_country,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
  const mapsHref = safeMapsUrl(brand.google_maps_url);
  const publicSocialLinks = socialLinks.filter(
    (link) => link.key !== 'email' && link.key !== 'whatsapp',
  );
  const hasContactDetails = Boolean(
    email || (phone && phoneDigits.length >= 5) || whatsapp || companyLocation,
  );
  const settingsError = Boolean(brandError || socialError);

  return (
    <div className="contact-page">
      <header className="contact-hero">
        <p className="contact-eyebrow">
          <Sparkles size={14} aria-hidden="true" />
          CUSTOMER CARE
        </p>
        <h1>We’re here to help.</h1>
        <p>
          Questions about an order, a product, or finding the right thing? Reach out and our
          {brand.brand_name ? ` ${brand.brand_name}` : ''} team will be glad to help.
        </p>
        <span className="contact-hero-mark" aria-hidden="true">
          {brand.logo_url ? <img src={brand.logo_url} alt="" /> : brand.brand_name.charAt(0)}
        </span>
      </header>

      <section className="contact-details" aria-labelledby="contact-details-title">
        <div className="contact-section-heading">
          <div>
            <p className="contact-eyebrow">GET IN TOUCH</p>
            <h2 id="contact-details-title">A good conversation starts here.</h2>
          </div>
          <Link to="/about" className="contact-about-link">
            Get to know us <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {isBrandLoading || isSocialLoading ? (
          <div className="contact-loading" role="status" aria-label="Loading contact details">
            <span />
            <span />
            <span />
          </div>
        ) : hasContactDetails ? (
          <div className="contact-card-grid">
            {email && (
              <a className="contact-card" href={`mailto:${email}`}>
                <span className="contact-card-icon">
                  <Mail aria-hidden="true" />
                </span>
                <span className="contact-card-label">Email us</span>
                <strong>{email}</strong>
                <span className="contact-card-action">
                  Send an email <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </a>
            )}

            {phone && phoneDigits.length >= 5 && (
              <a className="contact-card" href={`tel:${phoneHref}`}>
                <span className="contact-card-icon">
                  <Phone aria-hidden="true" />
                </span>
                <span className="contact-card-label">Call us</span>
                <strong>{phone}</strong>
                <span className="contact-card-action">
                  Call our team <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </a>
            )}

            {whatsapp && (
              <a
                className="contact-card"
                href={whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-card-icon contact-card-icon--whatsapp">
                  <whatsapp.Icon aria-hidden="true" />
                </span>
                <span className="contact-card-label">Message us</span>
                <strong>Chat on WhatsApp</strong>
                <span className="contact-card-action">
                  Start a conversation <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </a>
            )}

            {companyLocation && (
              <div className="contact-card contact-card--location">
                <span className="contact-card-icon">
                  <MapPin aria-hidden="true" />
                </span>
                <span className="contact-card-label">Our location</span>
                <strong>{brand.company_name || brand.brand_name}</strong>
                <span className="contact-card-address">{companyLocation}</span>
                {mapsHref && (
                  <a
                    className="contact-card-action"
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open map <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="contact-empty">
            <span className="contact-card-icon">
              <Mail aria-hidden="true" />
            </span>
            <h3>Our contact details are being updated.</h3>
            <p>Please check back soon or explore the latest from {brand.brand_name}.</p>
            <Link to="/shop">
              Explore the shop <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            {settingsError && (
              <span className="contact-settings-note">
                Contact options are temporarily unavailable.
              </span>
            )}
          </div>
        )}
      </section>

      {publicSocialLinks.length > 0 && (
        <section className="contact-social" aria-label="Connect on social media">
          <div>
            <p className="contact-eyebrow">STAY IN THE LOOP</p>
            <h2>Find us elsewhere.</h2>
          </div>
          <nav className="contact-social-links" aria-label="Social media">
            {publicSocialLinks.map(({ key, label, href, color, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                style={{ '--contact-social-color': color } as CSSProperties}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </section>
      )}
    </div>
  );
}
