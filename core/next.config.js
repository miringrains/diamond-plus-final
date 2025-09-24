/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable source maps in production for better error tracking
  productionBrowserSourceMaps: true,
  
  // Experimental features
  experimental: {
    // Better error handling
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['https://diamondplusportal.com'],
    },
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // ESLint configuration
  eslint: {
    // WARNING: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Custom webpack config for better debugging
  webpack: (config, { dev, isServer }) => {
    // Enable source maps in production
    if (!dev && !isServer) {
      config.devtool = 'source-map'
    }
    
    // Redirect old video player imports to throw errors
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components/video-player-client': '@/components/video-player-disabled',
      '@/components/video-player-enhanced': '@/components/video-player-disabled',
      '@/components/video-player': '@/components/video-player-disabled',
    }
    
    return config
  },
}

module.exports = nextConfig