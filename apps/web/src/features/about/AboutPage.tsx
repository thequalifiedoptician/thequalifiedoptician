import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import AboutPageContentView from './AboutPageContentView';
import { loadPublishedAboutPage } from './aboutService';
import type { AboutPageContent } from './aboutContent';
import './about-page.css';

export default function AboutPage() {
  const [content, setContent] = useState<AboutPageContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void loadPublishedAboutPage().then(
      (publishedContent) => {
        if (active) {
          setContent(publishedContent);
          setError(null);
          setIsLoading(false);
        }
      },
      (loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : 'About page content could not be loaded.',
          );
          setIsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (isLoading) {
    return (
      <main className="about-page-state" role="status" aria-label="Loading About page">
        <span />
        <span />
        <span />
      </main>
    );
  }

  if (error || !content) {
    return (
      <main className="about-page-state about-page-state--error" role="alert">
        <p>{error ?? 'About page content is unavailable.'}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setReloadKey((key) => key + 1);
          }}
        >
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </button>
      </main>
    );
  }

  return (
    <main className="about-page">
      <AboutPageContentView content={content} />
    </main>
  );
}
