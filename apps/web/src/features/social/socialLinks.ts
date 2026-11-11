import type { ComponentType, SVGProps } from 'react';
import { Mail } from 'lucide-react';
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  LinkedInBrandIcon,
  PinterestBrandIcon,
  TikTokBrandIcon,
  WhatsAppBrandIcon,
  XBrandIcon,
  YouTubeBrandIcon,
} from './SocialBrandIcon';
import type { SocialSettings } from './socialSettingsService';

export type SocialLink = {
  key: string;
  label: string;
  href: string;
  color: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  external: boolean;
};

function getExternalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getSocialLinks(settings: SocialSettings | null): SocialLink[] {
  if (!settings) return [];

  const links: SocialLink[] = [];
  const phone = settings.whatsapp_number.replace(/\D/gu, '');
  if (settings.enable_whatsapp && phone) {
    const url = new URL(`https://wa.me/${phone}`);
    url.searchParams.set('text', settings.whatsapp_message);
    links.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      href: url.toString(),
      color: '#25d366',
      Icon: WhatsAppBrandIcon,
      external: true,
    });
  }

  const networks: {
    key: string;
    label: string;
    enabled: boolean;
    value: string;
    color: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
  }[] = [
    {
      key: 'facebook',
      label: 'Facebook',
      enabled: settings.enable_facebook,
      value: settings.facebook_url,
      color: '#1877f2',
      Icon: FacebookBrandIcon,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      enabled: settings.enable_instagram,
      value: settings.instagram_url,
      color: '#c13584',
      Icon: InstagramBrandIcon,
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      enabled: settings.enable_tiktok,
      value: settings.tiktok_url,
      color: '#111111',
      Icon: TikTokBrandIcon,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      enabled: settings.enable_linkedin,
      value: settings.linkedin_url,
      color: '#0a66c2',
      Icon: LinkedInBrandIcon,
    },
    {
      key: 'youtube',
      label: 'YouTube',
      enabled: settings.enable_youtube,
      value: settings.youtube_url,
      color: '#ff0033',
      Icon: YouTubeBrandIcon,
    },
    {
      key: 'twitter',
      label: 'Twitter (X)',
      enabled: settings.enable_twitter,
      value: settings.twitter_url,
      color: '#14171a',
      Icon: XBrandIcon,
    },
    {
      key: 'pinterest',
      label: 'Pinterest',
      enabled: settings.enable_pinterest,
      value: settings.pinterest_url,
      color: '#bd081c',
      Icon: PinterestBrandIcon,
    },
  ];

  for (const network of networks) {
    const href = network.enabled ? getExternalUrl(network.value) : null;
    if (href) {
      links.push({ ...network, href, external: true });
    }
  }

  const email = settings.email.trim();
  if (settings.enable_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    links.push({
      key: 'email',
      label: 'Email',
      href: `mailto:${email}`,
      color: '#34584b',
      Icon: Mail,
      external: false,
    });
  }
  return links;
}
