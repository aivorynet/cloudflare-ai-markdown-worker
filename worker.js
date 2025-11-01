/**
 * AI Markdown Web Worker for Cloudflare
 *
 * Detects AI user agents and serves markdown versions of web content.
 * Supports both pre-generated markdown files and on-the-fly HTML to markdown conversion.
 *
 * @license MIT
 * @author AIVory (https://aivory.net)
 */

// ============================================================================
// CONFIGURATION - Customize these settings for your site
// ============================================================================

const CONFIG = {
  // Path prefix for pre-generated markdown files
  // Examples: '/md', '/ai', '/markdown'
  markdownPathPrefix: '/md',

  // Markdown file naming pattern
  // Options: 'index' for /md/about/index.md or 'direct' for /md/about.md
  markdownFilePattern: 'index',

  // Content selectors to try (in order) when extracting main content
  // Set to ['body'] to convert entire page, or specify selectors for main content only
  contentSelectors: [
    'body'
  ],

  // AI user agents to detect
  aiUserAgents: [
    'claude', 'anthropic', 'claude-bot',
    'gptbot', 'chatgpt', 'openai',
    'google-extended', 'googlebot-extended', 'bard', 'gemini',
    'perplexity', 'perplexitybot',
    'bytespider', 'ccbot', 'meta-externalagent',
    'cohere', 'youbot', 'anthropicbot',
  ]
};

// ============================================================================
// Dependencies
// ============================================================================

import TurndownService from 'turndown';
import { parseHTML } from 'linkedom';

// ============================================================================
// Worker Code
// ============================================================================

addEventListener('fetch', event => {
  event.passThroughOnException()
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    const url = new URL(request.url)
    const userAgent = request.headers.get('User-Agent')
    const isAI = isAIAgent(userAgent)

    // AI Agent detected and not already on markdown path
    if (isAI && !url.pathname.startsWith(CONFIG.markdownPathPrefix + '/')) {
      // Try to fetch pre-generated markdown first
      const markdownPath = convertToMarkdownPath(url.pathname)
      const markdownUrl = new URL(markdownPath, url.origin)
      markdownUrl.search = url.search

      const markdownRequest = new Request(markdownUrl, {
        method: request.method,
        headers: request.headers,
      })

      try {
        const response = await fetch(markdownRequest)

        // If pre-generated markdown exists, serve it
        if (response.ok) {
          const newResponse = new Response(response.body, response)
          newResponse.headers.set('X-AI-Agent', 'detected')
          newResponse.headers.set('X-Original-Path', url.pathname)
          newResponse.headers.set('X-Markdown-Path', markdownPath)
          newResponse.headers.set('Content-Type', 'text/markdown; charset=utf-8')
          newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow')
          return newResponse
        }

        // Markdown file not found, try converting HTML to markdown
        const htmlResponse = await fetch(request)

        if (htmlResponse.ok && htmlResponse.headers.get('content-type')?.includes('text/html')) {
          const html = await htmlResponse.text()
          const markdown = convertHtmlToMarkdown(html, url.pathname)

          return new Response(markdown, {
            status: 200,
            headers: {
              'Content-Type': 'text/markdown; charset=utf-8',
              'X-AI-Agent': 'detected-converted',
              'X-Original-Path': url.pathname,
              'X-Robots-Tag': 'noindex, nofollow',
            }
          })
        }
      } catch (error) {
        console.error(`Error processing AI request: ${error.message}`)
      }
    }

    // Forward request to origin for non-AI agents or if conversion failed
    // Do not modify headers or response in any way
    return await fetch(request)
  } catch (error) {
    console.error(`Worker error: ${error.message}`)
    return new Response('Service Unavailable', { status: 503 })
  }
}

/**
 * Check if user agent is an AI bot
 */
function isAIAgent(userAgent) {
  if (!userAgent) return false
  const lowerUA = userAgent.toLowerCase()
  return CONFIG.aiUserAgents.some(pattern => lowerUA.includes(pattern))
}

/**
 * Convert URL path to markdown file path
 * Respects CONFIG.markdownPathPrefix and CONFIG.markdownFilePattern
 */
function convertToMarkdownPath(pathname) {
  const prefix = CONFIG.markdownPathPrefix;

  if (pathname.startsWith(prefix + '/')) {
    return pathname
  }

  let cleanPath = pathname.replace(/\/$/, '')

  // Homepage
  if (cleanPath === '' || cleanPath === '/') {
    return `${prefix}/index.md`
  }

  // Regular pages - based on configuration
  if (CONFIG.markdownFilePattern === 'index') {
    // Hugo style: /md/about/index.md
    return `${prefix}${cleanPath}/index.md`
  } else {
    // Simple style: /md/about.md
    return `${prefix}${cleanPath}.md`
  }
}

/**
 * Convert HTML to Markdown using Turndown with linkedom for DOM parsing
 * Extracts main content and converts to clean markdown
 */
function convertHtmlToMarkdown(html, pathname) {
  // Parse HTML using linkedom to create a DOM
  const { document } = parseHTML(html);

  // Extract title
  const titleElement = document.querySelector('title');
  const title = titleElement ? titleElement.textContent.trim() : 'Page Content';

  // Try to extract main content using configured selectors
  let contentElement = null;

  for (const selector of CONFIG.contentSelectors) {
    try {
      contentElement = document.querySelector(selector);
      if (contentElement) {
        break;
      }
    } catch (e) {
      // Invalid selector, continue to next
      continue;
    }
  }

  // If no content element found, use body
  if (!contentElement) {
    contentElement = document.body || document.documentElement;
  }

  // Remove unwanted elements
  const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside'];
  for (const selector of unwantedSelectors) {
    const elements = contentElement.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  }

  // Initialize Turndown service with options
  const turndownService = new TurndownService({
    headingStyle: 'atx',        // Use # for headings
    codeBlockStyle: 'fenced',   // Use ``` for code blocks
    bulletListMarker: '-',       // Use - for bullet lists
    emDelimiter: '*',            // Use * for emphasis
    strongDelimiter: '**',       // Use ** for strong
    linkStyle: 'inlined',        // Use [text](url) for links
    preformattedCode: true       // Preserve code formatting
  });

  // Convert to markdown using the DOM element
  const markdown = turndownService.turndown(contentElement);

  // Return title and markdown content
  return `# ${title}\n\n${markdown}`
}
