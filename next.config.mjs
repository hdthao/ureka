/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://ssp.urekamedia.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
