import { BetaAnalyticsDataClient } from "@google-analytics/data";

const propertyId = process.env.GA4_PROPERTY_ID;

const client = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    ),
  },
});

export async function runAnalyticsReport(options: {
  dimensions?: string[];
  metrics: string[];
  startDate?: string;
  endDate?: string;
}) {
  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID is missing");
  }

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,

    dateRanges: [
      {
        startDate: options.startDate ?? "30daysAgo",
        endDate: options.endDate ?? "today",
      },
    ],

    dimensions:
      options.dimensions?.map((name) => ({
        name,
      })) ?? [],

    metrics: options.metrics.map((name) => ({
      name,
    })),
  });

  return response;
}

export async function getRealtimeOverview() {
  if (!propertyId) throw new Error("GA4_PROPERTY_ID is missing");
  const [response] = await client.runRealtimeReport({
    property: `properties/${propertyId}`,
    metrics: [{ name: "activeUsers" }, { name: "eventCount" }],
  });
  return {
    activeUsers: Number(response.rows?.[0]?.metricValues?.[0]?.value || 0),
    eventCount: Number(response.rows?.[0]?.metricValues?.[1]?.value || 0),
  };
}

export async function getTodayOverview() {
  const response = await runAnalyticsReport({
    metrics: ["activeUsers", "sessions", "eventCount"],
    startDate: "today",
    endDate: "today",
  });
  return {
    activeUsers: Number(response.rows?.[0]?.metricValues?.[0]?.value || 0),
    sessions: Number(response.rows?.[0]?.metricValues?.[1]?.value || 0),
    eventCount: Number(response.rows?.[0]?.metricValues?.[2]?.value || 0),
  };
}
export async function getUsersByCountry() {
  return runAnalyticsReport({
    dimensions: ["country"],

    metrics: ["activeUsers"],
  });
}

export async function getTrafficSources() {
  return runAnalyticsReport({
    dimensions: ["sessionSource"],

    metrics: ["sessions"],
  });
}

export async function getDevices() {
  return runAnalyticsReport({
    dimensions: ["deviceCategory"],

    metrics: ["activeUsers"],
  });
}

export async function getDailyUsers() {
  return runAnalyticsReport({
    dimensions: ["date"],

    metrics: ["activeUsers"],
  });
}