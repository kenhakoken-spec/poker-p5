import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // パスエイリアスの設定
    // process.cwd() を使用してプロジェクトルートを取得
    const rootPath = path.resolve(process.cwd());
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': rootPath,
    };
    return config;
  },
};

export default nextConfig;
