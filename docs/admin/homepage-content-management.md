# Homepage content management

The homepage is stored as a single versioned JSON document in `public.homepage_content`.
Administrators can edit a draft, preview it, reorder or hide sections, manage cards, and publish
the document atomically. The public storefront reads only `published_content` through the
`public.published_homepage_content` view. Draft access and writes require the authenticated
`app_metadata.role = admin` claim.

## Database setup

Apply `supabase/migrations/20261106120000_create_homepage_content.sql` before using the homepage
studio. The migration creates the singleton content table, admin-only row policy, public view,
and `save_homepage_content` function. The function validates the document root and updates the
draft and optional published version in one transaction.

## Admin workflow

- Open `/admin/homepage` (or `/admin`) to edit the hero, sections, and cards.
- Use the section controls to reorder, hide/show, or remove sections. Add a section from the
  supported section types.
- Expand cards to update their copy, image URL/alt text, badge, button, and destination. Product
  sections can select an existing catalog product; publishing requires selected catalog products
  to be active.
- Preview the current draft, save without publishing, or publish it to the storefront.
- Publishing checks required headings, image alternative text, unique section/card IDs, and safe
  links. Internal links must be site paths; external links must use HTTPS.
- Upload the shop page hero artwork in the “Shop page banner image” panel. JPG, PNG, WebP, and AVIF
  files up to 10 MB are supported. Add meaningful alternative text, then save or publish for the
  artwork to appear in the first `/shop` banner. The upload uses the existing public product image
  bucket and admin-only storage policies.

If no row has been saved yet, the studio initializes from the built-in homepage defaults. The
public homepage uses those same defaults until the first publication.
