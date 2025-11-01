# AI Markdown Web Worker

A Cloudflare Worker that automatically detects AI user agents and serves them markdown versions of your web content for better parsing and understanding.

## Two Modes of Operation

### Mode 1: Pre-generated Markdown (Recommended)

Generate markdown files for your pages and place them in a dedicated directory (e.g., `/md/`). The worker will serve these files to AI agents.

**Benefits:**
- Fast - no conversion needed
- Precise - full control over markdown output
- Customizable - include exactly what you want

**URL Mapping Examples:**
```
https://example.com/          → /md/index.md
https://example.com/about/    → /md/about/index.md  (or /md/about.md)
https://example.com/docs/api/ → /md/docs/api/index.md
```

### Mode 2: On-the-Fly HTML Conversion (Fallback)

If pre-generated markdown doesn't exist, the worker automatically converts HTML to markdown using Turndown.

**Trade-offs:**
- Slower - conversion happens on each request
- Less precise - relies on HTML structure parsing
- Works for any page - no generation needed

## About This Project

This project is maintained by [AIVory](https://aivory.net), a company specializing in real-time code compliance validation. We help developers ensure their code meets GDPR, HIPAA, SOC 2, PCI-DSS, and other compliance standards directly in their IDE and AI coding assistants.

**Why we built this:** AI agents spend significant tokens parsing HTML documents. By serving clean markdown to AI agents, we help reduce token usage while improving content comprehension. This benefits both AI providers and website owners by making content more accessible and efficient to process.

Check out our compliance tools at [aivory.net](https://aivory.net) - they catch compliance violations in real-time as you code, before commit, before deploy, before audit.

---

## Features

- **AI Agent Detection**: Automatically identifies requests from Claude, GPT, Gemini, Perplexity, and other AI bots
- **Dual Mode Support**:
  - Serves pre-generated markdown files (recommended)
  - Converts HTML to markdown on-the-fly as fallback
- **SEO Safe**: Markdown versions include `noindex, nofollow` headers
- **Zero Impact**: Regular users see normal HTML, completely unaffected
- **Analytics Ready**: Adds custom headers for tracking AI traffic
- **Configurable**: Customize paths, content extraction, and AI detection

## How It Works

1. Worker intercepts all requests to your domain
2. Checks if the User-Agent is an AI bot (Claude, GPT, Gemini, etc.)
3. For AI bots:
   - **First**: Tries to fetch pre-generated markdown from configured path (e.g., `/md/about/index.md`)
   - **Fallback**: If not found, converts the HTML response to markdown on-the-fly using Turndown
   - Adds `X-Robots-Tag: noindex, nofollow` header for SEO safety
4. For regular users: serves normal HTML content without modification
5. Adds tracking headers (`X-AI-Agent`) for analytics

## Installation

### Prerequisites

- Cloudflare account
- Domain configured on Cloudflare
- Node.js and npm installed
- Wrangler CLI: `npm install -g wrangler`

### Step 1: Install Dependencies

```bash
# Clone or download this repository
cd ai-markdown-web-worker

# Install dependencies (including Turndown for HTML to Markdown conversion)
npm install
```

### Step 2: Configure the Worker

Edit the `CONFIG` object at the top of `worker.js` to customize for your site:

```javascript
const CONFIG = {
  // Path prefix for markdown files (default: '/md')
  markdownPathPrefix: '/md',

  // File pattern: 'index' for /md/about/index.md or 'direct' for /md/about.md
  markdownFilePattern: 'index',

  // CSS selectors for extracting main content (tries in order)
  contentSelectors: ['main', 'article', '.content'],

  // Add or remove AI user agents to detect
  aiUserAgents: ['claude', 'gptbot', 'gemini', /* ... */]
};
```

### Step 3: Deploy

**Deploy via Wrangler CLI (Required)**

```bash
# Login to Cloudflare
wrangler login

# Edit wrangler.toml and set your domain in routes (uncomment and configure)

# Deploy (Wrangler automatically bundles Turndown and dependencies)
wrangler deploy
```

**Note**: Deployment via Cloudflare Dashboard is not recommended since the worker uses npm dependencies (Turndown) that require bundling. Wrangler handles this automatically.

### Step 4: Add Routes

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to "Triggers" tab
4. Add routes for your domain:
   - `yourdomain.com/*`
   - `www.yourdomain.com/*` (if using www)
5. Save

### Step 5: SEO Configuration (CRITICAL)

**IMPORTANT: You MUST configure your markdown directory for SEO safety:**

1. **Add to robots.txt** (prevents search engines from indexing markdown versions):
   ```
   User-agent: *
   Disallow: /md/
   ```

2. **Exclude from sitemap** - Ensure your sitemap.xml does NOT include `/md/*` URLs

3. **Verify noindex headers** - The worker automatically adds `X-Robots-Tag: noindex, nofollow` headers to all markdown responses, but excluding from robots.txt and sitemaps provides additional protection.

**Why this matters:** Search engines should only index your regular HTML pages, not the markdown versions served to AI agents. Without proper configuration, you risk duplicate content issues.

## Configuration

All configuration is done via the `CONFIG` object at the top of `worker.js`:

### Markdown Path Prefix

Change where markdown files are served from:

```javascript
markdownPathPrefix: '/md',  // Default
// Or use: '/ai', '/markdown', etc.
```

### File Naming Pattern

Choose how markdown files are organized:

```javascript
markdownFilePattern: 'index',  // Directory style: /md/about/index.md
// Or use: 'direct'            // File style: /md/about.md
```

**Examples:**
- With `'index'`: `/about/` → `/md/about/index.md`
- With `'direct'`: `/about/` → `/md/about.md`

### Content Extraction

Customize which HTML elements are extracted for conversion:

```javascript
contentSelectors: [
  'main',              // <main> element
  'article',           // <article> element
  '[role="main"]',     // Elements with role="main"
  '.content',          // Elements with class="content"
  '#main-content'      // Elements with id="main-content"
]
```

The worker tries each selector in order and uses the first match.

### AI User Agents

Add or remove AI bots to detect:

```javascript
aiUserAgents: [
  'claude', 'anthropic',
  'gptbot', 'chatgpt',
  'gemini',
  // Add your custom AI bot here
]
```

## Generating Markdown Files

To use pre-generated markdown files (recommended), you have several options:

### Option 1: Static Site Generators

If you use a static site generator (Hugo, Jekyll, Next.js, etc.), configure it to output markdown versions of your pages alongside HTML.

### Option 2: Build Script

Create a build script that converts your content to markdown and saves it to the `/md/` directory matching your URL structure.

Example directory structure:
```
public/
├── index.html              -> HTML version
├── about.html
├── docs/
│   └── api.html
└── md/                     -> Markdown versions
    ├── index.md
    ├── about/
    │   └── index.md
    └── docs/
        └── api/
            └── index.md
```

### Option 3: Manual Creation

For small sites, manually create markdown versions of your pages in the `/md/` directory.

### Content Quality Tips

For best results with on-the-fly HTML conversion:

1. Structure your HTML semantically (use `<main>`, `<article>` tags)
2. Use standard HTML tags (h1-h6, p, a, ul, li, etc.)
3. Avoid complex nested structures
4. Use the `contentSelectors` config to target your main content area

## Testing

**Test AI agent detection:**
```bash
curl -H "User-Agent: claude" https://yourdomain.com/about/ -v
```

**Check headers:**
```bash
curl -I -H "User-Agent: gptbot" https://yourdomain.com/
```

Look for:
- `Content-Type: text/markdown`
- `X-AI-Agent: detected` or `X-AI-Agent: detected-converted`
- `X-Robots-Tag: noindex, nofollow`

**Test regular users:**
```bash
curl https://yourdomain.com/
# Should return normal HTML
```

## Headers Added (AI Agents Only)

The worker adds custom headers only when serving markdown to AI agents. Regular user requests are not modified.

- `X-AI-Agent: detected` - Pre-generated markdown file was served
- `X-AI-Agent: detected-converted` - HTML was converted to markdown on-the-fly
- `X-Original-Path` - Original requested path
- `X-Markdown-Path` - Markdown file path (if pre-generated)
- `X-Robots-Tag: noindex, nofollow` - Prevents search engine indexing
- `Content-Type: text/markdown; charset=utf-8` - Markdown content type

## Robots.txt

Add to your `robots.txt` to prevent search engines from indexing markdown versions:

```
User-agent: *
Disallow: /md/
```

## HTML to Markdown Conversion

The worker uses [Turndown](https://github.com/mixmark-io/turndown) for high-quality HTML to markdown conversion. It handles:

- **Semantic HTML**: Properly converts headings, paragraphs, lists, tables
- **Code blocks**: Preserves formatting for code snippets
- **Links and images**: Maintains proper markdown syntax
- **Nested structures**: Handles complex HTML layouts

For best results:
1. **Pre-generate markdown files** (recommended for static sites)
2. **Customize content selectors** in CONFIG to match your HTML structure
3. **Structure HTML semantically** for better extraction

## Performance

- Worker adds ~1-5ms latency per request
- HTML to markdown conversion adds ~5-15ms
- Pre-generated markdown has minimal overhead
- Consider caching converted markdown in KV storage for high-traffic sites

## Browser Compatibility

The worker runs on Cloudflare's edge network and is compatible with all browsers. No client-side JavaScript required.

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## About AIVory

AIVory provides real-time compliance and security validation for developers. Our tools integrate directly into IDEs and AI coding assistants to catch violations as you code.

- Website: [aivory.net](https://aivory.net)
- Documentation: [aivory.net/docs](https://aivory.net/docs)
- Contact: support@aivory.net

We believe in making the web more efficient and accessible for both humans and AI agents.

## Credits

This project uses [Turndown](https://github.com/mixmark-io/turndown) by Dom Christie for HTML to Markdown conversion. Turndown is a highly configurable library that converts HTML to clean, semantic markdown.
