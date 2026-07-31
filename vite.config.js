import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

const base = process.env.BASE_PATH ?? '';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',
      kit: { adapterFallback: '404.html' },
      manifest: {
        name: 'Viagem para Dois — achados para escapar juntos',
        short_name: 'Viagem²',
        description: 'Achados de viagens e escapadas escolhidos para vocês dois',
        lang: 'pt-BR',
        theme_color: '#0B1220',
        background_color: '#0B1220',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `${base}/?app=viagem2-v3`,
        scope: `${base}/`,
        id: `${base}/`,
        icons: [
          { src: 'viagem2-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'viagem2-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'viagem2-icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Dataset no precache: as ofertas abrem offline, no metrô, no avião.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        navigateFallback: `${base}/404.html`,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      },
      devOptions: { enabled: false }
    })
  ]
});
