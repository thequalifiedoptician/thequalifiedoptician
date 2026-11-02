import { ArrowRight, Heart, PackageSearch, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { useId } from 'react';

const emptyStateContent = {
  products: {
    icon: PackageSearch,
    title: 'Nothing here just yet',
    description: 'A few thoughtful finds will be right along.',
  },
  search: {
    icon: Search,
    title: 'No matches this time',
    description: 'Try a different search or browse the full collection.',
  },
  wishlist: {
    icon: Heart,
    title: 'Your saved things live here',
    description: 'Keep the pieces you love close by saving them for later.',
  },
  cart: {
    icon: ShoppingBag,
    title: 'Your bag is taking a breather',
    description: 'When something feels just right, you can find it here.',
  },
} as const;

export type EmptyStateType = keyof typeof emptyStateContent;

type EmptyStateProps = {
  type: EmptyStateType;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ type, actionLabel, onAction }: EmptyStateProps) {
  const content = emptyStateContent[type];
  const Icon = content.icon;
  const headingId = useId();

  return (
    <section className="empty-state" aria-labelledby={headingId}>
      <span className="empty-state-art" aria-hidden="true">
        <span className="empty-state-orbit" />
        <Icon />
        <Sparkles className="empty-state-sparkle" />
      </span>
      <h2 id={headingId}>{content.title}</h2>
      <p>{content.description}</p>
      {actionLabel && onAction && (
        <button className="empty-state-action" type="button" onClick={onAction}>
          {actionLabel}
          <ArrowRight aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
