const fs = require('fs');
const { execSync } = require('child_process');

const banner = `/**
 * AI Markdown Web Worker for Cloudflare
 * https://github.com/aivorynet/cloudflare-ai-markdown-worker
 *
 * CONFIGURATION: Search for "const CONFIG" below to customize settings:
 * - markdownPathPrefix: Where markdown files are stored (default: '/md')
 * - markdownFilePattern: File naming pattern ('index' or 'direct')
 * - contentSelectors: Which HTML elements to convert (default: ['body'])
 * - aiUserAgents: Which AI bots to detect
 *
 * Built by AIVory (https://aivory.net) - Real-time code compliance validation
 * @license MIT
 */

`;

// Run esbuild
execSync('esbuild worker.js --bundle --format=esm --outfile=dist/worker.bundle.js', { stdio: 'inherit' });

// Prepend banner
const code = fs.readFileSync('dist/worker.bundle.js', 'utf8');
fs.writeFileSync('dist/worker.bundle.js', banner + code);

console.log('Build complete with custom banner');
