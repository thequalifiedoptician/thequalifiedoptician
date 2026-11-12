import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  House,
  Package,
  Tag,
  Sparkles,
  ClipboardList,
  Clock,
  CreditCard,
  Settings,
  Share2,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import './admin-navbar.css';

interface AdminNavItem {
  to: string;
  label: string;
  icon: typeof House;
  exact?: boolean;
}

const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin/homepage', label: 'Homepage', icon: House, exact: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/deals', label: 'Deals', icon: Tag },
  { to: '/admin/about', label: 'About', icon: Sparkles },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, exact: true },
  { to: '/admin/payments/pending', label: 'Pending Payments', icon: Clock },
  { to: '/admin/settings/payment-accounts', label: 'Payment Accounts', icon: CreditCard },
  { to: '/admin/settings/brand', label: 'Brand', icon: Settings },
  { to: '/admin/settings/social', label: 'Social Media', icon: Share2 },
];

export default function AdminNavbar() {
  const { pathname } = useLocation();
  const { settings: brand } = useBrandSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isItemActive = (item: AdminNavItem) => {
    if (item.exact) {
      return pathname === item.to;
    }
    return pathname.startsWith(item.to);
  };

  const closeMenu = () => setMobileMenuOpen(false);

  const brandInitial = (brand.brand_name || 'A').trim().charAt(0).toUpperCase();

  return (
    <header className="admin-unified-navbar">
      <div className="admin-unified-inner">
        <Link className="admin-brand-link" to="/admin/homepage" onClick={closeMenu}>
          <span className="admin-brand-mark">
            {brand.logo_url ? <img src={brand.logo_url} alt="" /> : brandInitial}
          </span>
          <span className="admin-brand-text">
            <strong>{brand.brand_name || 'Admin Console'}</strong>
            <small>{brand.brand_tagline || 'Admin console'}</small>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="admin-desktop-nav" aria-label="Admin console navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`admin-nav-item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/"
            className="admin-nav-item admin-nav-storefront"
            title="View customer storefront"
          >
            <ExternalLink size={14} aria-hidden="true" />
            <span>Storefront</span>
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="admin-mobile-toggle"
          aria-label={mobileMenuOpen ? 'Close admin navigation' : 'Open admin navigation'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile horizontal quick strip */}
      <nav className="admin-mobile-strip" aria-label="Admin quick tabs">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-strip-item ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={closeMenu}
            >
              <Icon size={13} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          to="/"
          className="admin-strip-item"
          title="View storefront"
          onClick={closeMenu}
        >
          <ExternalLink size={13} aria-hidden="true" />
          <span>Storefront</span>
        </Link>
      </nav>

      {/* Mobile dropdown drawer */}
      {mobileMenuOpen && (
        <div className="admin-mobile-drawer is-open">
          <div className="admin-drawer-grid">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`admin-drawer-link ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={closeMenu}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="admin-drawer-footer">
            <Link to="/" className="admin-drawer-storefront" onClick={closeMenu}>
              <ExternalLink size={15} aria-hidden="true" />
              <span>Back to Storefront</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
