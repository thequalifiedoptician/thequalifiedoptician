import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import type { ProductDetails } from './productDetailsService';

type ProductImageGalleryProps = Pick<ProductDetails, 'product' | 'images'>;

export default function ProductImageGallery({ product, images }: ProductImageGalleryProps) {
  const reduceMotion = useReducedMotion();
  const galleryImages =
    images.length > 0
      ? images
      : product.thumbnail_url
        ? [
            {
              id: 'thumbnail',
              image_url: product.thumbnail_url,
              alt_text: product.name,
            },
          ]
        : [];
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const selectedIndex = Math.max(
    0,
    galleryImages.findIndex((image) => image.id === selectedImageId),
  );
  const selectedImage = galleryImages[selectedIndex];

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (galleryImages.length < 2) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (selectedIndex + direction + galleryImages.length) % galleryImages.length;
      setSelectedImageId(galleryImages[nextIndex].id);
    }
  };

  return (
    <section
      className="product-gallery"
      aria-label={`${product.name} images`}
      tabIndex={galleryImages.length > 1 ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="product-gallery-hero">
        {selectedImage ? (
          <AnimatePresence initial={false} mode="wait">
            <motion.img
              key={selectedImage.id}
              src={selectedImage.image_url}
              alt={selectedImage.alt_text || product.name}
              className="product-gallery-image"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: reduceMotion ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24 }}
              fetchPriority="high"
            />
          </AnimatePresence>
        ) : (
          <div className="product-gallery-placeholder" role="img" aria-label="No product image">
            <ImageOff aria-hidden="true" />
            <span>Image coming soon</span>
          </div>
        )}
        {galleryImages.length > 1 && (
          <span className="product-gallery-count" aria-live="polite">
            {selectedIndex + 1} / {galleryImages.length}
          </span>
        )}
      </div>

      {galleryImages.length > 1 && (
        <div className="product-gallery-thumbnails" role="group" aria-label="Choose product image">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              className="product-gallery-thumbnail"
              type="button"
              aria-label={`Show image ${index + 1} of ${galleryImages.length} for ${product.name}`}
              aria-pressed={image.id === selectedImage?.id}
              onClick={() => setSelectedImageId(image.id)}
            >
              <img src={image.image_url} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
          <span className="visually-hidden">
            Use the left and right arrow keys to change images.
          </span>
        </div>
      )}
    </section>
  );
}
