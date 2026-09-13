# Blog Content Rules (NovaAPI Storefront)

## Default Image Rule (all blog posts)

1. Every blog post MUST have its own unique default cover image, stored in `backend/public/covers/<slug>.png` (800x450, gradient + title).
2. Every post MUST include at least one `<img>` block, at least one `<table>` block, and emoji in the text.
3. Text content supports rich blocks: headings (`h`), paragraphs (`p`), lists (`list`), images (`img`), and tables (`table`).
4. To add a new post:
   - Generate its cover with `python3 /tmp/opencode/gen_covers.py` style script (add slug + colors + title).
   - Add the post object to `backend/src/blog.js` with a unique `slug`, a `category` from the 5 existing ones, and rich `content`.
   - Never reuse another post's cover image.
5. All posts must be listed in `sitemap.xml` automatically via the `/sitemap.xml` endpoint.

## Categories

- `getting-started` — account setup, redemption, first token
- `guides` — practical integration tutorials
- `models` — model selection and pricing
- `news` — product updates and announcements
- `cost` — billing and cost optimization

## Comment / Engagement Rules

- All comments are moderation-gated (`status: pending`) with spam filtering and rate limiting.
- Do NOT generate fake comments, fake reviews, or fabricated user engagement. Only real user comments or clearly-labeled demo samples are allowed.
- Reply templates are available in 17 languages via `/api/blog/reply-templates`.
