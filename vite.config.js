import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

const siteUrl = 'https://www.digitallab.studio'
const pages = [
  '/audit-site-web',
  '/services',
  '/projects',
  '/method',
  '/about',
  '/blog',
  '/faq',
  '/contact',
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: siteUrl,
      dynamicRoutes: pages,
      changefreq: {
        '/': 'weekly',
        '/audit-site-web': 'weekly',
        '/services': 'weekly',
        '/projects': 'weekly',
        '/method': 'monthly',
        '/about': 'monthly',
        '/blog': 'weekly',
        '/faq': 'monthly',
        '/contact': 'monthly',
      },
      priority: {
        '/': 1,
        '/audit-site-web': 0.95,
        '/services': 0.9,
        '/projects': 0.9,
        '/method': 0.8,
        '/about': 0.7,
        '/blog': 0.8,
        '/faq': 0.6,
        '/contact': 0.7,
      },
      lastmod: new Date(),
      generateRobotsTxt: false,
      readable: true,
    }),
  ],
})
