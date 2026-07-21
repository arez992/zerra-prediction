import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "https://zerraprediction.com";

  const normalizedUrl = configuredUrl.startsWith("http")
    ? configuredUrl
    : `https://${configuredUrl}`;

  return normalizedUrl.replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/en/admin/",
          "/ku/admin/",
          "/ar/admin/",
          "/dashboard/",
          "/en/dashboard/",
          "/ku/dashboard/",
          "/ar/dashboard/",
          "/preview/",
          "/en/preview/",
          "/ku/preview/",
          "/ar/preview/",
          "/login",
          "/en/login",
          "/ku/login",
          "/ar/login",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
