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
        dataState: "final",
      },
    });

  return response.data;
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
