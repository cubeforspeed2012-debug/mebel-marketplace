import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Фото уходят на сервер вместе с формой товара: по умолчанию сюда
    // пролезает только 1 МБ, а снимок с телефона весит больше.
    serverActions: { bodySizeLimit: '25mb' },
  },
};

export default nextConfig;
