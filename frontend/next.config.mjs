/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    reactCompiler: true,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.API_INTERNAL_URL || 'http://backend:8000/api'}/:path*`,
            },
        ];
    },
};

export default nextConfig;
