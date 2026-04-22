/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['cf.bstatic.com', 'images.unsplash.com'],
  },
}
module.exports = nextConfig
