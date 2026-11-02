import { lazy, Suspense } from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

const BrandExperience = lazy(() => import('./BrandExperience'));

export default function BrandExperienceAsync() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="card" count={3} />}>
      <BrandExperience />
    </Suspense>
  );
}
