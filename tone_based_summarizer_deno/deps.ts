// Note: dotenv is typically imported directly where needed, e.g., in config.ts
// No need to re-export 'config' as it wasn't the correct export name anyway.
export {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
export { serve } from "https://deno.land/std@0.218.2/http/server.ts";
// PDF parsing will use external API (PDF.co)
// Scraping will use external API (ScrapingBee)
