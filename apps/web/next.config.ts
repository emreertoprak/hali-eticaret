import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Tarayıcıdan gelen /api/* istekleri backend'e proxy'lenir (CORS gerekmez).
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      // Yönetim panelinden yüklenen görseller API tarafından sunulur.
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
