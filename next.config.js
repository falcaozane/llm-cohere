/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    MONGODB_ATLAS_URI: process.env.MONGODB_ATLAS_URI,
    COHERE_API_KEY: process.env.COHERE_API_KEY,
  },
};

module.exports = nextConfig;
