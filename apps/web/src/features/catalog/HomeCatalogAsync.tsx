import { lazy, Suspense } from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

const CuratedDiscoveries = lazy(() => import('./CuratedDiscoveries'));
const ProductShowcase = lazy(() => import('./ProductShowcase'));

export default function HomeCatalogAsync() {
  return (
    <>
      <Suspense fallback={<LoadingSkeleton variant="category" count={4} />}>
        <CuratedDiscoveries />
      </Suspense>
      <Suspense fallback={<LoadingSkeleton variant="product" count={4} />}>
        <ProductShowcase />
      </Suspense>
    </>
  );
}
