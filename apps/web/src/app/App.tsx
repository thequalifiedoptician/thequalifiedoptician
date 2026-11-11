import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/router';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { BrandSettingsProvider } from '@/features/brand/BrandSettingsProvider';
import { SocialSettingsProvider } from '@/features/social/SocialSettingsProvider';

export default function App() {
  return (
    <BrandSettingsProvider>
      <SocialSettingsProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </SocialSettingsProvider>
    </BrandSettingsProvider>
  );
}
