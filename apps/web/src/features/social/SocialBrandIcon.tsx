import {
  faFacebook,
  faInstagram,
  faLinkedin,
  faPinterest,
  faTiktok,
  faWhatsapp,
  faXTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/free-brands-svg-icons';
import type { SVGProps } from 'react';

function SocialBrandIcon({ icon, ...props }: SVGProps<SVGSVGElement> & { icon: IconDefinition }) {
  const [width, height, , , paths] = icon.icon;
  const pathList = Array.isArray(paths) ? paths : [paths];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {pathList.map((path, index) => (
        <path d={path} key={index} />
      ))}
    </svg>
  );
}

export function FacebookBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faFacebook} {...props} />;
}

export function InstagramBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faInstagram} {...props} />;
}

export function WhatsAppBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faWhatsapp} {...props} />;
}

export function TikTokBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faTiktok} {...props} />;
}

export function LinkedInBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faLinkedin} {...props} />;
}

export function YouTubeBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faYoutube} {...props} />;
}

export function XBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faXTwitter} {...props} />;
}

export function PinterestBrandIcon(props: SVGProps<SVGSVGElement>) {
  return <SocialBrandIcon icon={faPinterest} {...props} />;
}
