import { motion, useReducedMotion } from 'framer-motion';
import { Leaf, MoveLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthHeader() {
  return (
    <header className="auth-header">
      <Link to="/" className="auth-brand" aria-label="AlSera home">
        <span className="auth-brand-mark" aria-hidden="true">
          <Leaf />
        </span>
        <span className="auth-brand-lockup">
          <span>AlSera</span>
          <small>OBJECTS FOR LIVING</small>
        </span>
      </Link>
      <Link to="/" className="auth-return-link">
        <MoveLeft aria-hidden="true" />
        Back to the store
      </Link>
    </header>
  );
}

export function AuthFooter() {
  return (
    <footer className="auth-footer">
      <span>© {new Date().getFullYear()} AlSera</span>
      <span className="auth-footer-separator" aria-hidden="true">
        ·
      </span>
      <span>A considered point of view</span>
    </footer>
  );
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="auth-layout">
      <span className="auth-background-orbit auth-background-orbit--one" aria-hidden="true" />
      <span className="auth-background-orbit auth-background-orbit--two" aria-hidden="true" />
      <span className="auth-background-glow auth-background-glow--one" aria-hidden="true" />
      <span className="auth-background-glow auth-background-glow--two" aria-hidden="true" />
      <AuthHeader />
      <main className="auth-main">
        <motion.div
          className="auth-main-inner"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
      <AuthFooter />
    </div>
  );
}

export function AuthCard({
  children,
  className = '',
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      className={`auth-card${className ? ` ${className}` : ''}`}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}
