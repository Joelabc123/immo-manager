import type { NextConfig } from "next";
import dotenv from "dotenv";
import createNextIntlPlugin from "next-intl/plugin";
import { resolve } from "path";

// Load .env from monorepo root
dotenv.config({ path: resolve(__dirname, "../../.env") });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/shared"],
};

export default withNextIntl(nextConfig);
