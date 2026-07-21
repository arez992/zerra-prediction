import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";

import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const revalidate = 3600;

type SeoPageDocument = {
  status?: unknown;
  canonicalPath?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
};

function getBaseUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "https://zerraprediction.com";

  const normalizedUrl =
    configuredUrl.startsWith("http")
      ? configuredUrl
      : `https://${configuredUrl}`;

  return normalizedUrl.replace(/\/+$/, "");
}

function normalizeCanonicalPath(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    if (
      trimmedValue.startsWith("http://") ||
      trimmedValue.startsWith("https://")
    ) {
      const parsedUrl = new URL(trimmedValue);

      return `${parsedUrl.pathname}${parsedUrl.search}`;
    }
  } catch {
    return null;
  }

  return trimmedValue.startsWith("/")
    ? trimmedValue
    : `/${trimmedValue}`;
}

function serializeDate(
  value: unknown
): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    const convertedDate = (
      value as {
        toDate: () => Date;
      }
    ).toDate();

    return Number.isNaN(
      convertedDate.getTime()
    )
      ? undefined
      : convertedDate;
  }

  if (typeof value === "string") {
    const parsedDate = new Date(value);

    return Number.isNaN(
      parsedDate.getTime()
    )
      ? undefined
      : parsedDate;
  }

  return undefined;
}

const getPublishedSeoPages =
  unstable_cache(
    async () => {
      const snapshot =
        await adminDb
          .collection("seoPageDrafts")
          .where(
            "status",
            "==",
            "published"
          )
          .get();

      return snapshot.docs.map(
        (document) => ({
          id: document.id,
          data:
            document.data() as SeoPageDocument,
        })
      );
    },
    [
      "zerra-sitemap-published-seo-pages",
    ],
    {
      revalidate: 3600,
    }
  );

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const generatedAt = new Date();

  const staticEntries: MetadataRoute.Sitemap =
    [
      {
        url: baseUrl,
        lastModified: generatedAt,
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: `${baseUrl}/en`,
        lastModified: generatedAt,
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: `${baseUrl}/en/predictions`,
        lastModified: generatedAt,
        changeFrequency: "hourly",
        priority: 0.9,
      },
      {
        url: `${baseUrl}/en/vip`,
        lastModified: generatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      },
    ];

  try {
    const publishedPages =
      await getPublishedSeoPages();

    const dynamicEntries: MetadataRoute.Sitemap =
      publishedPages.flatMap(
        ({
          id,
          data,
        }) => {
          const canonicalPath =
            normalizeCanonicalPath(
              data.canonicalPath
            );

          if (!canonicalPath) {
            console.warn(
              `[SITEMAP] Skipping published SEO page without a valid canonicalPath: ${id}`
            );

            return [];
          }

          const lastModified =
            serializeDate(
              data.updatedAt
            ) ||
            serializeDate(
              data.publishedAt
            ) ||
            generatedAt;

          return [
            {
              url: `${baseUrl}${canonicalPath}`,
              lastModified,
              changeFrequency:
                "daily" as const,
              priority: 0.8,
            },
          ];
        }
      );

    const uniqueEntries =
      new Map<
        string,
        MetadataRoute.Sitemap[number]
      >();

    for (const entry of [
      ...staticEntries,
      ...dynamicEntries,
    ]) {
      uniqueEntries.set(
        entry.url,
        entry
      );
    }

    return Array.from(
      uniqueEntries.values()
    );
  } catch (error) {
    console.error(
      "[SITEMAP_GENERATION_ERROR]",
      error
    );

    return staticEntries;
  }
}