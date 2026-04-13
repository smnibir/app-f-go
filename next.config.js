/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Next.js 14: externalize Prisma/bcrypt in server bundles (avoids missing ./NNN.js chunks after HMR).
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      { source: "/register", destination: "/", permanent: false },
      { source: "/sign-in", destination: "/", permanent: false },
      { source: "/signup", destination: "/", permanent: false },
    ];
  },
};

module.exports = nextConfig;
