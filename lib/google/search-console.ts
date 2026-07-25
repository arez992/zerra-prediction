import { google } from "googleapis";

const serviceAccountEmail =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

const serviceAccountPrivateKey =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

const defaultSiteUrl =
  process.env.SEARCH_CONSOLE_SITE_URL ||
  "https://zerraprediction.com/";

function validateGoogleCredentials() {
  if (!serviceAccountEmail) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL is missing"
    );
  }

  if (!serviceAccountPrivateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing"
    );
  }

  if (!defaultSiteUrl) {
    throw new Error(
      "SEARCH_CONSOLE_SITE_URL is missing"
    );
  }
}

function getSearchConsoleClient() {
  validateGoogleCredentials();

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: serviceAccountPrivateKey,
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
  });

  return google.searchconsole({
    version: "v1",
    auth,
  });
}

type SearchConsoleOptions = {
  siteUrl?: string;
  startDate?: string;
  endDate?: string;
  dimensions?: Array<
    "query" | "page" | "country" | "device" | "date"
  >;
  rowLimit?: number;
  startRow?: number;
  dataState?: "final" | "all";
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultDates() {
  const end = new Date();

  // Search Console data can be delayed, so exclude today.
  end.setDate(end.getDate() - 2);

  const start = new Date(end);
  start.setDate(start.getDate() - 27);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

export async function runSearchConsoleReport(
  options: SearchConsoleOptions = {}
) {
  const searchConsole = getSearchConsoleClient();
  const defaultDates = getDefaultDates();

  const siteUrl = options.siteUrl || defaultSiteUrl;

  const response =
    await searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate:
          options.startDate || defaultDates.startDate,
        endDate:
          options.endDate || defaultDates.endDate,
        dimensions: options.dimensions || ["query"],
        rowLimit: Math.min(options.rowLimit || 1000, 25000),
        startRow: options.startRow || 0,
        dataState: options.dataState || "final",
      },
    });

  return response.data;
}

export async function getSearchConsoleAccountAudit() {
  const searchConsole = getSearchConsoleClient();
  const normalizedConfigured = defaultSiteUrl.trim();
  const expectedDomain = "zerraprediction.com";
  const configuredPropertyType = normalizedConfigured.startsWith("sc-domain:")
    ? "domain"
    : /^https?:\/\//i.test(normalizedConfigured)
      ? "url-prefix"
      : "other";

  const configuredMatchesExpected =
    normalizedConfigured === `sc-domain:${expectedDomain}` ||
    normalizedConfigured === `https://${expectedDomain}` ||
    normalizedConfigured === `https://${expectedDomain}/`;

  const configuredContainsVercel =
    /vercel\.app/i.test(normalizedConfigured);

  const sitesResponse = await searchConsole.sites.list();
  const siteEntries = sitesResponse.data.siteEntry || [];

  const properties = await Promise.all(
    siteEntries.map(async (site) => {
      const siteUrl = site.siteUrl || "";
      let sitemaps: Array<{
        path: string;
        errors: number;
        warnings: number;
        lastSubmitted: string | null;
      }> = [];
      let sitemapReadError: string | null = null;

      try {
        const sitemapResponse = await searchConsole.sitemaps.list({
          siteUrl,
        });
        sitemaps = (sitemapResponse.data.sitemap || []).map((item) => ({
          path: item.path || "",
          errors: Number(item.errors || 0),
          warnings: Number(item.warnings || 0),
          lastSubmitted: item.lastSubmitted || null,
        }));
      } catch (error) {
        sitemapReadError =
          error instanceof Error ? error.message : "Unknown sitemap read error";
      }

      return {
        siteUrl,
        permissionLevel: site.permissionLevel || "unknown",
        isZerraDomain:
          siteUrl === `sc-domain:${expectedDomain}` ||
          siteUrl === `https://${expectedDomain}` ||
          siteUrl === `https://${expectedDomain}/`,
        isVercelProperty: /vercel\.app/i.test(siteUrl),
        sitemaps,
        sitemapReadError,
      };
    })
  );

  return {
    configuredProperty: {
      type: configuredPropertyType,
      matchesExpected: configuredMatchesExpected,
      containsVercel: configuredContainsVercel,
    },
    properties,
    summary: {
      totalProperties: properties.length,
      zerraProperties: properties.filter((item) => item.isZerraDomain).length,
      vercelProperties: properties.filter((item) => item.isVercelProperty).length,
    },
  };
}

export async function getSearchQueries(
  rowLimit = 100
) {
  const report = await runSearchConsoleReport({
    dimensions: ["query"],
    rowLimit,
  });

  return (
    report.rows?.map((row) => ({
      query: row.keys?.[0] || "Unknown",
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number(
        (row.position || 0).toFixed(2)
      ),
    })) || []
  );
}

export async function getSearchCountries(
  rowLimit = 100
) {
  const report = await runSearchConsoleReport({
    dimensions: ["country"],
    rowLimit,
  });

  return (
    report.rows?.map((row) => ({
      countryCode: row.keys?.[0] || "unknown",
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number(
        (row.position || 0).toFixed(2)
      ),
    })) || []
  );
}

export async function getSearchPages(
  rowLimit = 100
) {
  const report = await runSearchConsoleReport({
    dimensions: ["page"],
    rowLimit,
  });

  return (
    report.rows?.map((row) => ({
      page: row.keys?.[0] || "Unknown",
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number(
        (row.position || 0).toFixed(2)
      ),
    })) || []
  );
}

export async function getSearchDevices() {
  const report = await runSearchConsoleReport({
    dimensions: ["device"],
    rowLimit: 10,
  });

  return (
    report.rows?.map((row) => ({
      device: row.keys?.[0] || "Unknown",
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number(
        (row.position || 0).toFixed(2)
      ),
    })) || []
  );
}

export async function getSearchFreshness() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 27);

  const report = await runSearchConsoleReport({
    startDate: formatDate(start),
    endDate: formatDate(end),
    dimensions: ["date"],
    rowLimit: 100,
    dataState: "all",
  });

  const rows =
    report.rows?.map((row) => ({
      date: row.keys?.[0] || "Unknown",
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number((row.position || 0).toFixed(2)),
    })) || [];

  const dataThrough =
    rows.length > 0
      ? [...rows].map((item) => item.date).sort().at(-1) || null
      : null;

  const metadata = report.metadata as
    | { first_incomplete_date?: string }
    | undefined;

  return {
    rows,
    dataThrough,
    firstIncompleteDate: metadata?.first_incomplete_date || null,
    includesFreshData: true,
    dataState: "all" as const,
  };
}
export async function getDailySearchPerformance(
  rowLimit = 100
) {
  const report = await runSearchConsoleReport({
    dimensions: ["date"],
    rowLimit,
  });

  return (
    report.rows?.map((row) => ({
      date: row.keys?.[0] || "Unknown",
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number(
        (row.position || 0).toFixed(2)
      ),
    })) || []
  );
}
