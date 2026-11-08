import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  Heart,
  House,
  Mail,
  Menu,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import GlobalSearch from '@/components/shared/GlobalSearch';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toAuthServiceError } from '@/features/auth/utils/authErrors';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import { useCart } from '@/features/cart/useCart';
import { useWishlist } from '@/features/wishlist/useWishlist';

const MotionLink = motion.create(Link);

const navigationItems = [
  { label: 'Home', to: '/', Icon: House },
  { label: 'Shop', to: '/shop', Icon: Store },
  { label: 'Deals', to: '/deals', Icon: Tag },
  { label: 'About', to: '/about', Icon: Sparkles },
  { label: 'Contact', to: '/contact', Icon: Mail },
];

const iconActions = [
  { label: 'Wishlist', Icon: Heart },
  { label: 'Shopping cart', Icon: ShoppingBag },
  { label: 'Notifications', Icon: Bell },
];

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authActionError, setAuthActionError] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const { productIds: wishlistProductIds } = useWishlist();
  const { itemCount } = useCart();
  const location = useLocation();

  const handleSignOut = async () => {
    setAuthActionError('');
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      setAuthActionError(toAuthServiceError(error).message);
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8);

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });

    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  const handleDrawerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== 'Tab' || !drawerRef.current) {
      return;
    }

    const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    const firstElement = focusableElements.item(0);
    const lastElement = focusableElements.item(focusableElements.length - 1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.header
      className="site-header"
      data-scrolled={isScrolled}
      initial={prefersReducedMotion ? false : { y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="header-main">
        <div className="header-top-row">
          <button
            ref={menuButtonRef}
            className="icon-button mobile-menu-trigger"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>

          <Link className="brand" to="/" aria-label="AlSera home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M20 5.5c5.1 5.5 8.3 10.1 8.3 14.2a8.3 8.3 0 1 1-16.6 0C11.7 15.6 14.9 11 20 5.5Z" />
                <path d="M20 16.8v12.7" />
                <path d="M20 24.7c-4.9-4.7-8.7-5.7-11-3.8 1.6 5.3 5.3 8 11 7.9" />
                <path d="M20 24.7c4.9-4.7 8.7-5.7 11-3.8-1.6 5.3-5.3 8-11 7.9" />
              </svg>
            </span>
            <span className="brand-lockup">
              <span className="brand-name">AlSera</span>
              <span className="brand-caption">OBJECTS FOR LIVING</span>
            </span>
          </Link>

          <GlobalSearch key={`${location.pathname}${location.search}`} className="header-search" />

          <div className="header-actions" aria-label="Quick links">
            {iconActions.map(({ label, Icon }) =>
              label === 'Wishlist' ? (
                <Link
                  className="icon-button wishlist-header-link"
                  aria-label={`Wishlist${wishlistProductIds.size ? `, ${wishlistProductIds.size} saved` : ''}`}
                  key={label}
                  to="/wishlist"
                >
                  <Icon aria-hidden="true" />
                  {wishlistProductIds.size > 0 && (
                    <span className="wishlist-header-count" aria-hidden="true">
                      {wishlistProductIds.size > 9 ? '9+' : wishlistProductIds.size}
                    </span>
                  )}
                </Link>
              ) : label === 'Shopping cart' ? (
                <MotionLink
                  className="icon-button cart-header-link"
                  aria-label={`Shopping cart${itemCount ? `, ${itemCount} items` : ''}`}
                  key={label}
                  to="/cart"
                  whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.06 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                >
                  <Icon aria-hidden="true" />
                  {itemCount > 0 && (
                    <motion.span
                      className="cart-header-count"
                      key={itemCount}
                      initial={prefersReducedMotion ? false : { scale: 0.7 }}
                      animate={{ scale: 1 }}
                      aria-hidden="true"
                    >
                      {itemCount > 99 ? '99+' : itemCount}
                    </motion.span>
                  )}
                </MotionLink>
              ) : (
                <motion.button
                  className="icon-button"
                  type="button"
                  aria-label={label}
                  key={label}
                  whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.06 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                >
                  <Icon aria-hidden="true" />
                </motion.button>
              ),
            )}
          </div>
        </div>

        <nav className="desktop-navigation" aria-label="Main navigation">
          {navigationItems.map(({ label, to, Icon }) => (
            <NavLink
              className={({ isActive }) => `navigation-link${isActive ? ' is-active' : ''}`}
              end={to === '/'}
              key={label}
              to={to}
            >
              {({ isActive }) => (
                <>
                  <Icon className="navigation-item-icon" aria-hidden="true" />
                  <span>{label}</span>
                  {isActive && (
                    <motion.span
                      className="navigation-indicator"
                      layoutId="navigation-indicator"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
          <span className="navigation-note">A considered point of view</span>
          <div className="desktop-auth-actions" aria-label="Account actions">
            {isLoading ? null : isAuthenticated ? (
              <details className="header-account-menu">
                <summary className="header-account-trigger" aria-label="Open account menu">
                  <span className="header-account-avatar" aria-hidden="true">
                    {user?.email?.charAt(0).toUpperCase() ?? <UserRound aria-hidden="true" />}
                  </span>
                  <span>Account</span>
                  <ChevronDown className="header-account-chevron" aria-hidden="true" />
                </summary>
                <div className="header-account-popover">
                  <span className="header-account-eyebrow">SIGNED IN AS</span>
                  <span className="header-account-email">{user?.email ?? 'AlSera customer'}</span>
                  <NavLink className="header-account-orders" to="/account/orders">
                    My orders <span aria-hidden="true">→</span>
                  </NavLink>
                  <button
                    className="header-account-signout"
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                    aria-busy={isSigningOut}
                  >
                    {isSigningOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </details>
            ) : (
              <>
                <Link
                  className="header-auth-link"
                  to={AUTH_ROUTES.login}
                  state={getAuthRedirectState(location)}
                >
                  Sign in
                </Link>
                <Link className="header-auth-link header-auth-create" to={AUTH_ROUTES.signup}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
        {authActionError && (
          <p className="header-auth-error" role="alert">
            {authActionError}
          </p>
        )}

        <GlobalSearch
          key={`${location.pathname}${location.search}`}
          className="mobile-search header-search"
        />
      </div>

      {createPortal(
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="mobile-navigation-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <button
                className="mobile-navigation-backdrop"
                type="button"
                aria-label="Close navigation menu"
                tabIndex={-1}
                onClick={closeMenu}
              />
              <motion.aside
                ref={drawerRef}
                className="mobile-navigation-drawer"
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-label="Mobile navigation"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={transition}
                onKeyDown={handleDrawerKeyDown}
              >
                <div className="drawer-heading">
                  <span className="drawer-title">Explore AlSera</span>
                  <motion.button
                    ref={closeButtonRef}
                    className="icon-button"
                    type="button"
                    aria-label="Close navigation menu"
                    onClick={closeMenu}
                    whileHover={prefersReducedMotion ? undefined : { rotate: 90 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  >
                    <X aria-hidden="true" />
                  </motion.button>
                </div>
                <nav className="mobile-navigation-links" aria-label="Main navigation">
                  {navigationItems.map(({ label, to, Icon }, index) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        ...transition,
                        delay: prefersReducedMotion ? 0 : 0.04 * index,
                      }}
                    >
                      <NavLink
                        className={({ isActive }) =>
                          `mobile-navigation-link${isActive ? ' is-active' : ''}`
                        }
                        end={to === '/'}
                        to={to}
                        onClick={closeMenu}
                      >
                        <span className="mobile-link-label">
                          <Icon aria-hidden="true" />
                          <span>{label}</span>
                        </span>
                        <span className="mobile-link-arrow" aria-hidden="true">
                          →
                        </span>
                      </NavLink>
                    </motion.div>
                  ))}
                </nav>
                <div className="mobile-auth-actions" aria-label="Account actions">
                  {isLoading ? null : isAuthenticated ? (
                    <>
                      <p className="mobile-auth-user">
                        Signed in as <strong>{user?.email ?? 'AlSera customer'}</strong>
                      </p>
                      <Link
                        className="mobile-auth-button mobile-auth-orders"
                        to="/account/orders"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My orders
                      </Link>
                      <button
                        className="mobile-auth-button mobile-auth-signout"
                        type="button"
                        onClick={() => void handleSignOut()}
                        disabled={isSigningOut}
                        aria-busy={isSigningOut}
                      >
                        {isSigningOut ? 'Signing out…' : 'Sign out'}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        className="mobile-auth-button mobile-auth-signin"
                        to={AUTH_ROUTES.login}
                        state={getAuthRedirectState(location)}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        className="mobile-auth-button mobile-auth-create"
                        to={AUTH_ROUTES.signup}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Create account
                      </Link>
                    </>
                  )}
                  {authActionError && (
                    <p className="header-auth-error" role="alert">
                      {authActionError}
                    </p>
                  )}
                </div>
                <p className="drawer-caption">Considered essentials for everyday living.</p>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.header>
  );
}
