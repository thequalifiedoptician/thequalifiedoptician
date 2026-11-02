import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toAuthServiceError } from '@/features/auth/utils/authErrors';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Categories', to: '/categories' },
  { label: 'Deals', to: '/deals' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
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
  const location = useLocation();
  const navigate = useNavigate();

  const handleAccountAction = () => {
    if (!isAuthenticated) {
      navigate(AUTH_ROUTES.login, {
        state: getAuthRedirectState(location),
      });
    }
  };

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

          <div className="header-search">
            <motion.span
              className="search-icon"
              aria-hidden="true"
              whileHover={prefersReducedMotion ? undefined : { rotate: -10, scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 340, damping: 18 }}
            >
              <Search />
            </motion.span>
            <input
              aria-label="Search products"
              type="search"
              placeholder="Search considered essentials"
            />
            <kbd className="search-shortcut" aria-hidden="true">
              ⌘ K
            </kbd>
          </div>

          <div className="header-actions" aria-label="Quick links">
            {iconActions.map(({ label, Icon }) => (
              <motion.button
                className="icon-button"
                type="button"
                aria-label={label}
                key={label}
                onClick={
                  label === 'Wishlist' || label === 'Shopping cart'
                    ? handleAccountAction
                    : undefined
                }
                whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.06 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              >
                <Icon aria-hidden="true" />
              </motion.button>
            ))}
          </div>
        </div>

        <nav className="desktop-navigation" aria-label="Main navigation">
          {navigationItems.map(({ label, to }) => (
            <NavLink
              className={({ isActive }) => `navigation-link${isActive ? ' is-active' : ''}`}
              end={to === '/'}
              key={label}
              to={to}
            >
              {({ isActive }) => (
                <>
                  {label}
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
              <>
                <span className="header-user-email" title={user?.email}>
                  {user?.email ?? 'Signed in'}
                </span>
                <button
                  className="header-auth-link header-auth-signout"
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

        <div className="mobile-search header-search">
          <Search aria-hidden="true" />
          <input
            aria-label="Search products"
            type="search"
            placeholder="Search considered essentials"
          />
          <kbd className="search-shortcut" aria-hidden="true">
            ⌘ K
          </kbd>
        </div>
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
                  {navigationItems.map(({ label, to }, index) => (
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
                        <span>{label}</span>
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
