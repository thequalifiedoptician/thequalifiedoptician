import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Headset, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function FloatingActions() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const supportButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 560);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSupportOpen) {
        setIsSupportOpen(false);
        supportButtonRef.current?.focus();
      }
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isSupportOpen]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const closeSupport = () => {
    setIsSupportOpen(false);
    supportButtonRef.current?.focus();
  };

  return (
    <div className="floating-actions">
      <AnimatePresence>
        {isSupportOpen && (
          <motion.aside
            className="support-popover"
            id="support-popover"
            aria-label="Customer support preview"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          >
            <div className="support-popover-heading">
              <span className="support-popover-icon" aria-hidden="true">
                <Headset />
              </span>
              <div>
                <strong>Here to help</strong>
                <small>Support experience preview</small>
              </div>
              <button
                className="support-popover-close"
                type="button"
                onClick={closeSupport}
                aria-label="Close support preview"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <p>Customer support details will be available when the store launches.</p>
            <a href="#faq-preview" onClick={() => setIsSupportOpen(false)}>
              Browse common questions
            </a>
          </motion.aside>
        )}
      </AnimatePresence>

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

        <motion.button
          className={`floating-action-button floating-action-button--support${isSupportOpen ? ' is-open' : ''}`}
          ref={supportButtonRef}
          type="button"
          aria-label={isSupportOpen ? 'Close support preview' : 'Open customer support preview'}
          aria-expanded={isSupportOpen}
          aria-controls={isSupportOpen ? 'support-popover' : undefined}
          onClick={() => setIsSupportOpen((open) => !open)}
          whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.03 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
        >
          {isSupportOpen ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
        </motion.button>
      </div>
    </div>
  );
}
