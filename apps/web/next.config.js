/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    // En algunos setups, el minimizador CSS (cssnano) falla con ciertos selectores
    // que incluyen '/', aunque el CSS sea válido para el navegador.
    // Para no romper builds de producción, removemos SOLO el minimizador de CSS.
    if (!dev && config?.optimization?.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (plugin) => {
          const name = plugin?.constructor?.name ?? '';
          return !name.toLowerCase().includes('cssminimizer');
        }
      );
    }
    return config;
  },
};

module.exports = nextConfig;

