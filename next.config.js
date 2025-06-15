/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    domains: [
      'example.com', 
      'avatars.githubusercontent.com',
      'via.placeholder.com',
      'jerseycitybitcoin.com',
      // All possible S3 URL formats
      's3.amazonaws.com',
      's3.us-east-1.amazonaws.com',
      'jerseycitybitcoin.com.s3.amazonaws.com',
      'jerseycitybitcoin.com.s3.us-east-1.amazonaws.com',
      's3-us-east-1.amazonaws.com',
      's3-external-1.amazonaws.com',
      'amazonaws.com',
      // Allow bucket name as subdomain
      'jerseycitybitcoin-com.s3.amazonaws.com',
      'jerseycitybitcoin-com.s3.us-east-1.amazonaws.com',
    ],
    // Disable image optimization for external URLs during development
    unoptimized: process.env.NODE_ENV === 'development'
  },
};

export default config;
