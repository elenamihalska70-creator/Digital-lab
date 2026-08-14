import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'
import { seoRoutes } from './seo-routes.config.js'

const siteUrl = 'https://www.digitallab.studio'
const pages = seoRoutes

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: siteUrl,
      dynamicRoutes: pages,
      // Note: vite-plugin-sitemap normalizes every dynamicRoutes entry
      // through path.parse(), which strips trailing slashes — so the sitemap
      // <loc> for "/en" comes out as ".../en" even though its canonical URL
      // is ".../en/". scripts/prerender.mjs patches just that one entry
      // after this plugin runs (see fixEnglishHomepageSitemapSlash()).
      changefreq: {
        '/': 'weekly',
        '/en': 'weekly',
        '/audit-site-web': 'weekly',
        '/projects/microassist': 'monthly',
        '/projects/socle-local': 'monthly',
        '/projects/microassist-expert': 'monthly',
        '/projects/assistant-reservation-ia': 'monthly',
        '/services/automatisation-pme': 'monthly',
        '/services/chatbot-ia': 'monthly',
        '/services/creation-site-web': 'monthly',
        '/services/creation-site-web-besancon': 'monthly',
        '/mentions-legales': 'yearly',
      },
      priority: {
        '/': 1,
        '/en': 0.9,
        '/audit-site-web': 0.95,
        '/projects/microassist': 0.7,
        '/projects/socle-local': 0.7,
        '/projects/microassist-expert': 0.7,
        '/projects/assistant-reservation-ia': 0.7,
        '/services/automatisation-pme': 0.7,
        '/services/chatbot-ia': 0.7,
        '/services/creation-site-web': 0.7,
        '/services/creation-site-web-besancon': 0.65,
        '/mentions-legales': 0.3,
      },
      lastmod: new Date(),
      generateRobotsTxt: false,
      readable: true,
    }),
  ],
})
