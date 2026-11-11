import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, MessageCircle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocialSettings } from '@/features/social/socialSettingsContext';
import { getSocialLinks } from '@/features/social/socialLinks';

export default function FloatingActions() {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { settings, isLoading, error } = useSocialSettings();
  const contactLinks = useMemo(() => getSocialLinks(settings), [settings]);
  const widgetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const emptyStateRef = useRef<HTMLParagraphElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 560);
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !widgetRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    if (firstLinkRef.current) {
      firstLinkRef.current.focus();
    } else {
      emptyStateRef.current?.focus();
    }
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [isOpen]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="floating-actions">
      <div className="floating-action-stack">
        <AnimatePresence>
          {isVisible && (
            <motion.button
              className="floating-action-button floating-action-button--top"
              type="button"
              aria-label="Scroll to top"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              onClick={scrollToTop}
              whileHover={prefersReducedMotion ? undefined : { y: -3 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
            >
              <ArrowUp aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="social-contact-widget" ref={widgetRef}>
          <AnimatePresence>
            {isOpen && (
              <motion.aside
                className="social-contact-menu"
                id="social-contact-menu"
                aria-label="Contact and social media links"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              >
                <div className="social-contact-heading">
                  <strong>Connect with us</strong>
                  <span>Choose an option to get in touch.</span>
                </div>
                {contactLinks.length ? (
                  <div className="social-contact-links">
                    {contactLinks.map(({ key, label, href, color, Icon, external }, index) => (
                      <a
                        key={key}
                        ref={index === 0 ? firstLinkRef : undefined}
                        className="social-contact-link"
                        href={href}
                        title={label}
                        aria-label={label}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        onClick={() => {
                          setIsOpen(false);
                          triggerRef.current?.focus();
                        }}
                      >
                        <span
                          className="social-contact-icon"
                          style={{ color, backgroundColor: `${color}16` }}
                        >
                          <Icon aria-hidden="true" />
                        </span>
                        <span>{label}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p
                    className="social-contact-empty"
                    ref={emptyStateRef}
                    tabIndex={-1}
                    role="status"
                  >
                    {isLoading
                      ? 'Loading contact options…'
                      : error
                        ? 'Contact options could not be loaded.'
                        : 'No contact options are currently available.'}
                  </p>
                )}
              </motion.aside>
            )}
          </AnimatePresence>

          <motion.button
            className={`floating-action-button floating-action-button--support${isOpen ? ' is-open' : ''}`}
            ref={triggerRef}
            type="button"
            aria-label={
              isOpen
                ? 'Close contact and social media links'
                : 'Open contact and social media links'
            }
            aria-expanded={isOpen}
            aria-controls="social-contact-menu"
            onClick={() => setIsOpen((open) => !open)}
            whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.03 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
          >
            {isOpen ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
