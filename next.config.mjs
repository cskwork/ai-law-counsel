/** @type {import('next').NextConfig} */
const nextConfig = {
  // 국가법령정보센터 API 호출을 위해 Node.js runtime 필수
  experimental: {
    serverComponentsExternalPackages: ['fast-xml-parser'],
  },
};

export default nextConfig;
