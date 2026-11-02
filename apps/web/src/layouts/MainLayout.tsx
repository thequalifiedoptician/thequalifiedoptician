import { Outlet } from 'react-router-dom';
import FloatingActions from '@/components/shared/FloatingActions';
import SiteFooter from '@/components/shared/SiteFooter';
import SiteHeader from '@/components/shared/SiteHeader';

export default function MainLayout() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="page-container">
        <Outlet />
      </main>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
