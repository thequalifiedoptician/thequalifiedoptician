import { useMemo } from 'react';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import NewsletterSignup from './NewsletterSignup';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import { useSocialSettings } from '@/features/social/socialSettingsContext';
import { getSocialLinks } from '@/features/social/socialLinks';

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

export default function SiteFooter() {
  const { settings: brand } = useBrandSettings();
  const { settings: socialSettings } = useSocialSettings();
  const socialLinks = useMemo(() => getSocialLinks(socialSettings), [socialSettings]);
  const companyLocation = [
    brand.company_address,
    brand.company_city,
    brand.postal_code,
    brand.company_country,
  ]
    .filter(Boolean)
    .join(', ');
  let googleMapsHref: string | null = null;
  if (brand.google_maps_url) {
    try {
      const mapUrl = new URL(brand.google_maps_url);
      if (mapUrl.protocol === 'https:') {
        googleMapsHref = mapUrl.href;
      }
    } catch {
      googleMapsHref = null;
    }
  }
  const copyright = brand.footer_copyright
    .replaceAll('{year}', String(new Date().getFullYear()))
    .replaceAll('{brand_name}', brand.brand_name);

  return (
    <footer className="site-footer" id="footer">
      <div className="footer-container">
        <NewsletterSignup brandName={brand.brand_name} />

        <div className="footer-main">
          <section className="footer-brand" aria-label={`About ${brand.brand_name}`}>
            <Link className="footer-logo" to="/" aria-label={`${brand.brand_name} home`}>
              <span className="footer-logo-mark" aria-hidden="true">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt="" />
                ) : (
                  brand.brand_name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="footer-logo-lockup">
                <span>{brand.brand_name}</span>
                {brand.brand_tagline && <small>{brand.brand_tagline}</small>}
              </span>
            </Link>
            {brand.brand_tagline && <p>{brand.brand_tagline}</p>}
            {(brand.company_email ||
              brand.support_email ||
              brand.company_phone ||
              companyLocation ||
              brand.company_name) && (
              <div className="footer-contact-preview" aria-label="Company contact information">
                {brand.company_name && (
                  <span>
                    <span>{brand.company_name}</span>
                  </span>
                )}
                {brand.company_email && (
                  <span>
                    <Mail aria-hidden="true" />
                    <a href={`mailto:${brand.company_email}`}>{brand.company_email}</a>
                  </span>
                )}
                {brand.support_email && brand.support_email !== brand.company_email && (
                  <span>
                    <Mail aria-hidden="true" />
                    <a href={`mailto:${brand.support_email}`}>{brand.support_email}</a>
                  </span>
                )}
                {brand.company_phone && (
                  <span>
                    <Phone aria-hidden="true" />
                    <a href={`tel:${brand.company_phone}`}>{brand.company_phone}</a>
                  </span>
                )}
                {companyLocation && (
                  <span>
                    <MapPin aria-hidden="true" />
                    {googleMapsHref ? (
                      <a href={googleMapsHref} target="_blank" rel="noreferrer">
                        {companyLocation}
                      </a>
                    ) : (
                      <span>{companyLocation}</span>
                    )}
                  </span>
                )}
              </div>
            )}
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
          <p>{copyright}</p>
          {socialLinks.length > 0 && (
            <nav className="footer-socials" aria-label="Social channels">
              <span>FIND US ELSEWHERE</span>
              {socialLinks.map(({ key, label, href, color, Icon, external }) => (
                <a
                  className="footer-social-button"
                  aria-label={label}
                  title={label}
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  style={{ color }}
                  key={key}
                >
                  <Icon aria-hidden="true" />
                </a>
              ))}
            </nav>
          )}
          <a className="footer-back-to-top" href="#main-content">
            Back to the beginning
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
