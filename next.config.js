const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_WS_PATH: process.env.WS_PATH || "/ws",
  },
};

module.exports = nextConfig;
