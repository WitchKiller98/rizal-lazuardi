/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'mpasi-pos-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60, // 24 jam
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
})

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
}

module.exports = withPWA(nextConfig)
