# Nazariya — Front-end

The front-end for **näzariya**, a multimedia agency built on the belief that perspective defines identity.

This is a static, pre-built single-page site (HTML, CSS, JS, and media assets). No build step is required to host it — the files can be served as-is.

## Local preview

From this folder, run any static file server, for example:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Structure

- `index.html` — entry point
- `assets/` — bundled JS/CSS
- `hero/`, `services/`, `stamps/`, `brand/` — section media
- `work/` — portfolio media (packaging, branding, web, content, social)
- `_redirects` — SPA fallback rule for hosts like Netlify / Cloudflare Pages
