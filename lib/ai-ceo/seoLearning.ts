import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  collectAICEOData,
} from "@/lib/ai-ceo/dataCollector";

const SEO_DRAFT_COLLECTION =
  "seoPageDrafts";

const LEARNING_COLLECTION =
  "zaosLearning";

const ZAOS_LEARNING_VERSION =
  "1.0.0";

const DEFAULT_MEASUREMENT_WINDOW_DAYS =
  14;

const MAX_MEASUREMENT_BATCH =
  50;

type LearningOutcome =
  | "success"
  | "failure"
  | "neutral";

type LearningRecord = {
  id:
    string;

  version:
    string;

  agent:
    "seo";

  recommendationId:
    string;

  recommendationType:
    string;

  createdAt:
    string;

  completedAt:
    string;

  outcome:
    LearningOutcome;

  score:
    number;

  metricsBefore:
    Record<
      string,
      unknown
    >;

  metricsAfter:
    Record<
      string,
      unknown
    >;

  notes:
    string[];

  tags:
    string[];

  metadata:
    Record<
      string,
      unknown
    >;
};

type SearchConsolePageMetric = {
  page:
    string;

  clicks:
    number;

  impressions:
    number;

  ctr:
    number;

  position:
    number;
};

type SEOMetricSnapshot = {
  capturedAt:
    string;

  clicks:
    number;

  impressions:
    number;

  ctr:
    number;

  position:
    number;
};

type SEOMetricDelta = {
  clicks:
    number;

  impressions:
    number;

  ctr:
    number;

  position:
    number;
};

type SEOLearningResult = {
  draftId:
    string;

  canonicalPath:
    string;

  action:
    | "baseline-created"
    | "measured"
    | "waiting"
    | "skipped";

  outcome:
    LearningOutcome |
    null;

  score:
    number |
    null;

  reason:
    string;
};

export type SEOLearningSummary = {
  generatedAt:
    string;

  publishedPagesChecked:
    number;

  baselinesCreated:
    number;

  measuredPages:
    number;

  waitingPages:
    number;

  skippedPages:
    number;

  successfulPages:
    number;

  neutralPages:
    number;

  failedPages:
    number;

  items:
    SEOLearningResult[];
};

function normalizeText(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeNumber(
  value:
    unknown
): number {
  const parsed =
    typeof value ===
      "number"
      ? value
      : Number(
          value
        );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function normalizeTag(
  value:
    string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function normalizeUrlPath(
  value:
    string
): string {
  const clean =
    value.trim();

  if (
    !clean
  ) {
    return "";
  }

  try {
    if (
      clean.startsWith(
        "http://"
      ) ||
      clean.startsWith(
        "https://"
      )
    ) {
      const pathname =
        new URL(
          clean
        ).pathname;

      return pathname ===
        "/"
        ? "/"
        : pathname.replace(
            /\/+$/,
            ""
          );
    }
  } catch {
    /*
     * Fall through to relative-path
     * normalization.
     */
  }

  const path =
    clean
      .split(
        "?"
      )[0]
      .split(
        "#"
      )[0];

  if (
    path ===
    "/"
  ) {
    return "/";
  }

  return path.replace(
    /\/+$/,
    ""
  );
}

function serializeDate(
  value:
    unknown
): string | null {
  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    const parsed =
      Date.parse(
        value
      );

    return Number.isFinite(
      parsed
    )
      ? new Date(
          parsed
        ).toISOString()
      : null;
  }

  if (
    value instanceof
    Date
  ) {
    return value
      .toISOString();
  }

  if (
    value &&
    typeof value ===
      "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate:
          () => Date;
      }
    ).toDate ===
      "function"
  ) {
    return (
      value as {
        toDate:
          () => Date;
      }
    )
      .toDate()
      .toISOString();
  }

  return null;
}

function getDaysBetween(
  from:
    string,

  to:
    string
): number {
  const fromTime =
    Date.parse(
      from
    );

  const toTime =
    Date.parse(
      to
    );

  if (
    !Number.isFinite(
      fromTime
    ) ||
    !Number.isFinite(
      toTime
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (
        toTime -
        fromTime
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    )
  );
}

function findPageMetric(
  canonicalPath:
    string,

  pages:
    SearchConsolePageMetric[]
):
  SearchConsolePageMetric |
  null {
  const targetPath =
    normalizeUrlPath(
      canonicalPath
    );

  if (
    !targetPath
  ) {
    return null;
  }

  const match =
    pages.find(
      (
        page
      ) =>
        normalizeUrlPath(
          page.page
        ) ===
        targetPath
    );

  return match ||
    null;
}

function createMetricSnapshot(
  metric:
    SearchConsolePageMetric |
    null,

  capturedAt:
    string
): SEOMetricSnapshot {
  return {
    capturedAt,

    clicks:
      normalizeNumber(
        metric?.clicks
      ),

    impressions:
      normalizeNumber(
        metric?.impressions
      ),

    ctr:
      normalizeNumber(
        metric?.ctr
      ),

    position:
      normalizeNumber(
        metric?.position
      ),
  };
}

function calculateDelta(
  baseline:
    SEOMetricSnapshot,

  current:
    SEOMetricSnapshot
): SEOMetricDelta {
  return {
    clicks:
      current.clicks -
      baseline.clicks,

    impressions:
      current.impressions -
      baseline.impressions,

    ctr:
      Number(
        (
          current.ctr -
          baseline.ctr
        ).toFixed(
          2
        )
      ),

    /*
     * Lower Google Search Console
     * position is better.
     *
     * Example:
     * baseline = 20
     * current = 10
     * improvement = +10
     */
    position:
      Number(
        (
          baseline.position -
          current.position
        ).toFixed(
          2
        )
      ),
  };
}

function evaluateSEOOutcome(
  baseline:
    SEOMetricSnapshot,

  current:
    SEOMetricSnapshot,

  delta:
    SEOMetricDelta
): {
  outcome:
    LearningOutcome;

  score:
    number;

  notes:
    string[];
} {
  let score =
    50;

  const notes:
    string[] = [];

  if (
    delta.clicks >
    0
  ) {
    score +=
      Math.min(
        20,
        delta.clicks *
          2
      );

    notes.push(
      `Organic clicks increased by ${delta.clicks}.`
    );
  } else if (
    delta.clicks <
    0
  ) {
    score -=
      Math.min(
        20,
        Math.abs(
          delta.clicks
        ) *
          2
      );

    notes.push(
      `Organic clicks decreased by ${Math.abs(
        delta.clicks
      )}.`
    );
  }

  if (
    delta.impressions >
    0
  ) {
    score +=
      Math.min(
        15,
        Math.ceil(
          delta.impressions /
          10
        )
      );

    notes.push(
      `Search impressions increased by ${delta.impressions}.`
    );
  } else if (
    delta.impressions <
    0
  ) {
    score -=
      Math.min(
        15,
        Math.ceil(
          Math.abs(
            delta.impressions
          ) /
          10
        )
      );

    notes.push(
      `Search impressions decreased by ${Math.abs(
        delta.impressions
      )}.`
    );
  }

  if (
    delta.ctr >
    0
  ) {
    score +=
      Math.min(
        10,
        Math.ceil(
          delta.ctr *
          2
        )
      );

    notes.push(
      `CTR improved by ${delta.ctr} percentage point(s).`
    );
  } else if (
    delta.ctr <
    0
  ) {
    score -=
      Math.min(
        10,
        Math.ceil(
          Math.abs(
            delta.ctr
          ) *
          2
        )
      );

    notes.push(
      `CTR declined by ${Math.abs(
        delta.ctr
      )} percentage point(s).`
    );
  }

  /*
   * Position is evaluated only when
   * both snapshots have real position
   * values. A zero position generally
   * means the page was not found in the
   * Search Console snapshot.
   */
  if (
    baseline.position >
      0 &&
    current.position >
      0
  ) {
    if (
      delta.position >
      0
    ) {
      score +=
        Math.min(
          15,
          Math.ceil(
            delta.position
          )
        );

      notes.push(
        `Average search position improved by ${delta.position}.`
      );
    } else if (
      delta.position <
      0
    ) {
      score -=
        Math.min(
          15,
          Math.ceil(
            Math.abs(
              delta.position
            )
          )
        );

      notes.push(
        `Average search position declined by ${Math.abs(
          delta.position
        )}.`
      );
    }
  }

  const normalizedScore =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          score
        )
      )
    );

  /*
   * Do not classify a page as failure
   * when Google has not generated a
   * meaningful visibility sample yet.
   */
  const hasMeaningfulSample =
    current.impressions >=
      10 ||
    baseline.impressions >=
      10;

  if (
    !hasMeaningfulSample
  ) {
    notes.push(
      "The page does not yet have enough Search Console impressions for a strong performance conclusion."
    );

    return {
      outcome:
        "neutral",

      score:
        Math.max(
          50,
          normalizedScore
        ),

      notes,
    };
  }

  if (
    normalizedScore >=
    65
  ) {
    return {
      outcome:
        "success",

      score:
        normalizedScore,

      notes,
    };
  }

  if (
    normalizedScore <
    40
  ) {
    return {
      outcome:
        "failure",

      score:
        normalizedScore,

      notes,
    };
  }

  return {
    outcome:
      "neutral",

    score:
      normalizedScore,

    notes,
  };
}

function createLearningRecordId(
  draftId:
    string
): string {
  return `learning-seo-${draftId}`;
}

export async function runSEOLearningMeasurement(
  options?: {
    measurementWindowDays?:
      number;

    limit?:
      number;
  }
): Promise<
  SEOLearningSummary
> {
  const requestedWindow =
    options
      ?.measurementWindowDays;

  const measurementWindowDays =
    Number.isFinite(
      requestedWindow
    )
      ? Math.max(
          1,
          Math.floor(
            Number(
              requestedWindow
            )
          )
        )
      : DEFAULT_MEASUREMENT_WINDOW_DAYS;

  const requestedLimit =
    options
      ?.limit;

  const limit =
    Number.isFinite(
      requestedLimit
    )
      ? Math.min(
          MAX_MEASUREMENT_BATCH,
          Math.max(
            1,
            Math.floor(
              Number(
                requestedLimit
              )
            )
          )
        )
      : MAX_MEASUREMENT_BATCH;

  const now =
    new Date()
      .toISOString();

  /*
   * One verified AI CEO data snapshot
   * is shared across the complete batch.
   */
  const snapshot =
    await collectAICEOData();

  if (
    snapshot.searchConsole
      .connected !== true
  ) {
    throw new Error(
      "Search Console is unavailable. SEO learning measurement was stopped to avoid recording API failure as zero search performance."
    );
  }

  const rawSearchConsolePages =
    Array.isArray(
      snapshot
        .searchConsole
        .pages
    )
      ? snapshot
          .searchConsole
          .pages
      : [];

  const searchConsolePages:
    SearchConsolePageMetric[] =
    rawSearchConsolePages.map(
      (
        page
      ) => ({
        page:
          normalizeText(
            page.page
          ),

        clicks:
          normalizeNumber(
            page.clicks
          ),

        impressions:
          normalizeNumber(
            page.impressions
          ),

        ctr:
          normalizeNumber(
            page.ctr
          ),

        position:
          normalizeNumber(
            page.position
          ),
      })
    );

  const publishedSnapshot =
    await adminDb
      .collection(
        SEO_DRAFT_COLLECTION
      )
      .where(
        "status",
        "==",
        "published"
      )
      .limit(
        limit
      )
      .get();

  const items:
    SEOLearningResult[] =
      [];

  let baselinesCreated =
    0;

  let measuredPages =
    0;

  let waitingPages =
    0;

  let skippedPages =
    0;

  let successfulPages =
    0;

  let neutralPages =
    0;

  let failedPages =
    0;

  for (
    const document
    of publishedSnapshot.docs
  ) {
    const draftId =
      document.id;

    const draft =
      document.data() ||
      {};

    const canonicalPath =
      normalizeText(
        draft.canonicalPath
      );

    if (
      !canonicalPath
    ) {
      skippedPages +=
        1;

      items.push({
        draftId,

        canonicalPath:
          "",

        action:
          "skipped",

        outcome:
          null,

        score:
          null,

        reason:
          "Published SEO page does not have a canonical path.",
      });

      continue;
    }

    const existingLearningId =
      normalizeText(
        draft
          .seoLearning
          ?.learningRecordId
      );

    if (
      existingLearningId
    ) {
      skippedPages +=
        1;

      items.push({
        draftId,

        canonicalPath,

        action:
          "skipped",

        outcome:
          null,

        score:
          null,

        reason:
          "SEO learning measurement has already been completed for this page.",
      });

      continue;
    }

    const currentMetric =
      findPageMetric(
        canonicalPath,
        searchConsolePages
      );

    const baselineData =
      draft
        .seoLearning
        ?.baseline;

    const baselineCapturedAt =
      serializeDate(
        baselineData
          ?.capturedAt
      );

    /*
     * FIRST RUN
     *
     * Capture the baseline only.
     *
     * No learning outcome is created
     * before the real measurement window
     * has elapsed.
     */
    if (
      !baselineData ||
      !baselineCapturedAt
    ) {
      const baseline =
        createMetricSnapshot(
          currentMetric,
          now
        );

      const nextMeasurementEligibleAt =
        new Date(
          Date.now() +
            measurementWindowDays *
              24 *
              60 *
              60 *
              1000
        ).toISOString();

      await document
        .ref
        .update({
          "seoLearning.baseline":
            baseline,

          "seoLearning.measurementWindowDays":
            measurementWindowDays,

          "seoLearning.status":
            "waiting",

          "seoLearning.nextMeasurementEligibleAt":
            nextMeasurementEligibleAt,

          "seoLearning.updatedAt":
            FieldValue
              .serverTimestamp(),
        });

      baselinesCreated +=
        1;

      items.push({
        draftId,

        canonicalPath,

        action:
          "baseline-created",

        outcome:
          null,

        score:
          null,

        reason:
          `SEO learning baseline created. Performance will be evaluated after ${measurementWindowDays} day(s).`,
      });

      continue;
    }

    const storedMeasurementWindow =
      normalizeNumber(
        draft
          .seoLearning
          ?.measurementWindowDays
      );

    const effectiveMeasurementWindow =
      storedMeasurementWindow >
      0
        ? Math.floor(
            storedMeasurementWindow
          )
        : measurementWindowDays;

    const daysElapsed =
      getDaysBetween(
        baselineCapturedAt,
        now
      );

    if (
      daysElapsed <
      effectiveMeasurementWindow
    ) {
      waitingPages +=
        1;

      items.push({
        draftId,

        canonicalPath,

        action:
          "waiting",

        outcome:
          null,

        score:
          null,

        reason:
          `SEO page has been measured for ${daysElapsed} day(s). The configured learning window is ${effectiveMeasurementWindow} day(s).`,
      });

      continue;
    }

    const baseline:
      SEOMetricSnapshot = {
      capturedAt:
        baselineCapturedAt,

      clicks:
        normalizeNumber(
          baselineData.clicks
        ),

      impressions:
        normalizeNumber(
          baselineData
            .impressions
        ),

      ctr:
        normalizeNumber(
          baselineData.ctr
        ),

      position:
        normalizeNumber(
          baselineData
            .position
        ),
    };

    const current =
      createMetricSnapshot(
        currentMetric,
        now
      );

    const delta =
      calculateDelta(
        baseline,
        current
      );

    const evaluation =
      evaluateSEOOutcome(
        baseline,
        current,
        delta
      );

    const learningRecordId =
      createLearningRecordId(
        draftId
      );

    const publishedAt =
      serializeDate(
        draft.publishedAt
      ) ||
      baselineCapturedAt;

    const language =
      normalizeText(
        draft.language
      );

    const country =
      normalizeText(
        draft.country
      );

    const tags: string[] = [
      "seo",
      "seo-performance-measurement",
      evaluation.outcome,
    ];

    if (
      language
    ) {
      tags.push(
        `language-${normalizeTag(
          language
        )}`
      );
    }

    if (
      country
    ) {
      tags.push(
        `country-${normalizeTag(
          country
        )}`
      );
    }

    const record:
      LearningRecord = {
      id:
        learningRecordId,

      version:
        ZAOS_LEARNING_VERSION,

      agent:
        "seo",

      recommendationId:
        normalizeText(
          draft
            .sourceRecommendationId
        ) ||
        draftId,

      recommendationType:
        "seo-performance-measurement",

      createdAt:
        publishedAt,

      completedAt:
        now,

      outcome:
        evaluation.outcome,

      score:
        evaluation.score,

      metricsBefore: {
        clicks:
          baseline.clicks,

        impressions:
          baseline.impressions,

        ctr:
          baseline.ctr,

        position:
          baseline.position,
      },

      metricsAfter: {
        clicks:
          current.clicks,

        impressions:
          current.impressions,

        ctr:
          current.ctr,

        position:
          current.position,
      },

      notes: [
        `SEO page measured after ${daysElapsed} day(s).`,

        ...evaluation.notes,
      ],

      tags,

      metadata: {
        source:
          "seo-learning-engine",

        draftId,

        canonicalPath,

        slug:
          normalizeText(
            draft.slug
          ),

        keyword:
          normalizeText(
            draft.keyword
          ),

        fixtureId:
          normalizeText(
            draft.fixtureId
          ) ||
          null,

        language:
          language ||
          null,

        country:
          country ||
          null,

        measurementWindowDays:
          effectiveMeasurementWindow,

        daysElapsed,

        baseline,

        current,

        delta,

        publicationAutomation:
          draft
            .publicationAutomation ||
          null,
      },
    };

    const learningRef =
      adminDb
        .collection(
          LEARNING_COLLECTION
        )
        .doc(
          learningRecordId
        );

    /*
     * Deterministic learning IDs make
     * repeated runs idempotent.
     *
     * The same SEO page cannot create
     * duplicate learning documents.
     */
    const batch =
      adminDb.batch();

    batch.set(
      learningRef,
      record,
      {
        merge:
          true,
      }
    );

    batch.update(
      document.ref,
      {
        "seoLearning.status":
          "measured",

        "seoLearning.learningRecordId":
          learningRecordId,

        "seoLearning.outcome":
          evaluation.outcome,

        "seoLearning.score":
          evaluation.score,

        "seoLearning.current":
          current,

        "seoLearning.delta":
          delta,

        "seoLearning.measuredAt":
          FieldValue
            .serverTimestamp(),

        "seoLearning.updatedAt":
          FieldValue
            .serverTimestamp(),
      }
    );

    await batch.commit();

    measuredPages +=
      1;

    if (
      evaluation.outcome ===
      "success"
    ) {
      successfulPages +=
        1;
    } else if (
      evaluation.outcome ===
      "failure"
    ) {
      failedPages +=
        1;
    } else {
      neutralPages +=
        1;
    }

    items.push({
      draftId,

      canonicalPath,

      action:
        "measured",

      outcome:
        evaluation.outcome,

      score:
        evaluation.score,

      reason:
        `SEO performance measurement completed with outcome ${evaluation.outcome} and score ${evaluation.score}/100.`,
    });
  }

  return {
    generatedAt:
      now,

    publishedPagesChecked:
      publishedSnapshot
        .size,

    baselinesCreated,

    measuredPages,

    waitingPages,

    skippedPages,

    successfulPages,

    neutralPages,

    failedPages,

    items,
  };
}
