import {
  ArrowUpRight,
  Camera,
  CirclePlay,
  Leaf,
  Mail,
  MapPin,
  Phone,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NewsletterSignup from './NewsletterSignup';

const linkGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Shop all', href: '#featured-products' },
      { label: 'New arrivals', href: '#new-arrivals' },
      { label: 'Best sellers', href: '#best-sellers' },
      { label: 'Categories', href: '#category-section' },
      { label: 'Our point of view', href: '#brands-heading' },
    ],
  },
  {
    title: 'Customer care',
    links: [
      { label: 'Help & FAQs', href: '#faq-preview' },
      { label: 'Contact us', href: '/contact' },
      { label: 'Shipping information', href: '/policies/shipping' },
      { label: 'Returns & exchanges', href: '/policies/returns' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
  {
    title: 'The details',
    links: [
      { label: 'Terms & conditions', href: '/policies/terms' },
      { label: 'Privacy policy', href: '/policies/privacy' },
      { label: 'Shipping policy', href: '/policies/shipping' },
      { label: 'Returns policy', href: '/policies/returns' },
    ],
  },
];

const socialLinks = [
  { name: 'Photo feed', icon: Camera },
  { name: 'Community', icon: UsersRound },
  { name: 'Video channel', icon: CirclePlay },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer" id="footer">
      <div className="footer-container">
        <NewsletterSignup />

        <div className="footer-main">
          <section className="footer-brand" aria-label="About AlSera">
            <Link className="footer-logo" to="/" aria-label="AlSera home">
              <span className="footer-logo-mark" aria-hidden="true">
                <Leaf />
              </span>
              <span className="footer-logo-lockup">
                <span>AlSera</span>
                <small>OBJECTS FOR LIVING</small>
              </span>
            </Link>
            <p>
              A considered collection for the everyday. Thoughtful objects, chosen to feel at home
              in your life.
            </p>
            <div className="footer-contact-preview" aria-label="Contact details preview">
              <span>
                <Mail aria-hidden="true" />
                <span>Contact details coming soon</span>
              </span>
              <span>
                <Phone aria-hidden="true" />
                <span>Support hours to be confirmed</span>
              </span>
              <span>
                <MapPin aria-hidden="true" />
                <span>Serving thoughtful spaces everywhere</span>
              </span>
            </div>
            <p className="footer-detail-note">
              Contact information shown here is a launch preview.
            </p>
          </section>

          {linkGroups.map((group) => (
            <nav className="footer-link-group" aria-label={group.title} key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>
                      {link.label}
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} AlSera. A considered point of view.</p>
          <div className="footer-socials" aria-label="Social channels">
            <span>FIND US ELSEWHERE</span>
            {socialLinks.map(({ name, icon: Icon }) => (
              <button
                type="button"
                className="footer-social-button"
                aria-label={`${name} link coming soon`}
                title="Social links coming soon"
                disabled
                key={name}
              >
                <Icon aria-hidden="true" />
              </button>
            ))}
          </div>
          <a className="footer-back-to-top" href="#main-content">
            Back to the beginning
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
