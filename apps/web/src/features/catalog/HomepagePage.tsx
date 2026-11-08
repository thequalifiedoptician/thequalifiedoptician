import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { loadPublishedHomepage } from '@/features/admin/homepage/homepageContentService';
import HomepageContentView from './HomepageContentView';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; content: Awaited<ReturnType<typeof loadPublishedHomepage>> };

export default function HomepagePage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void loadPublishedHomepage().then(
      (content) => {
        if (active) {
          setState({ status: 'ready', content });
        }
      },
      (error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'The homepage content could not be loaded.',
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (state.status === 'loading') {
    return (
      <div className="page-container">
        <LoadingSkeleton variant="product" count={4} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <section className="shop-error" role="alert">
        <span>
          <AlertCircle size={23} aria-hidden="true" />
        </span>
        <h1>The homepage is taking a moment.</h1>
        <p>{state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading' });
            setReloadKey((key) => key + 1);
          }}
        >
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </button>
      </section>
    );
  }
  return <HomepageContentView content={state.content} />;
}
