import "server-only";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

const COLLECTION =
  "zaosLearning";

const DEFAULT_LIMIT =
  500;

const MAX_LIMIT =
  2000;

type PredictionLearningRecord = {
  predictionId:
    string | null;

  fixtureId:
    string | null;

  correct:
    boolean | null;

  result:
    string | null;

  modelVersion:
    string | null;

  primaryMarketCategory:
    string | null;

  primaryPick:
    string | null;

  primaryQualified:
    boolean | null;

  primaryConfidence:
    number | null;

  canonicalConfidence:
    number | null;

  confidence:
    number | null;

  completedAt:
    string | null;
};

export type CalibrationGroupStats = {
  key:
    string;

  total:
    number;

  correct:
    number;

  incorrect:
    number;

  accuracy:
    number | null;

  averageConfidence:
    number | null;

  averageCalibrationError:
    number | null;

  highConfidencePredictions:
    number;

  highConfidenceFailures:
    number;

  highConfidenceFailureRate:
    number | null;
};

export type PredictionCalibrationSummary = {
  generatedAt:
    string;

  totalPredictionRecords:
    number;

  evaluablePredictions:
    number;

  qualifiedPredictions:
    number;

  legacyPredictions:
    number;

  overall: {
    correct:
      number;

    incorrect:
      number;

    accuracy:
      number | null;

    averageConfidence:
      number | null;

    averageCalibrationError:
      number | null;

    highConfidencePredictions:
      number;

    highConfidenceFailures:
      number;

    highConfidenceFailureRate:
      number | null;
  };

  byMarketCategory:
    CalibrationGroupStats[];

  byModelVersion:
    CalibrationGroupStats[];

  sampleWarnings:
    string[];
};

function normalizeLimit(
  value:
    unknown
): number {
  const parsed =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(
        parsed
      )
    )
  );
}

function asRecord(
  value:
    unknown
): Record<
  string,
  unknown
> {
  return (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  )
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function asString(
  value:
    unknown
): string | null {
  return (
    typeof value ===
      "string" &&
    value.trim()
  )
    ? value.trim()
    : null;
}

function asNumber(
  value:
    unknown
): number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}

function asBoolean(
  value:
    unknown
): boolean | null {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function getConfidence(
  record:
    PredictionLearningRecord
): number | null {
  const value =
    record
      .primaryConfidence ??
    record
      .canonicalConfidence ??
    record
      .confidence;

  if (
    value ===
      null
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(
      0,
      value
    )
  );
}

function getCalibrationError(
  correct:
    boolean,

  confidence:
    number
): number {
  const observed =
    correct
      ? 100
      : 0;

  return Math.abs(
    confidence -
    observed
  );
}

function round(
  value:
    number,
  decimals =
    1
): number {
  const multiplier =
    10 **
    decimals;

  return (
    Math.round(
      value *
      multiplier
    ) /
    multiplier
  );
}

function percentage(
  numerator:
    number,

  denominator:
    number
): number | null {
  if (
    denominator <=
    0
  ) {
    return null;
  }

  return round(
    (
      numerator /
      denominator
    ) *
      100
  );
}

function average(
  values:
    number[]
): number | null {
  if (
    values.length ===
    0
  ) {
    return null;
  }

  return round(
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
      values.length
  );
}

function toPredictionLearningRecord(
  data:
    Record<
      string,
      unknown
    >
): PredictionLearningRecord {
  const metadata =
    asRecord(
      data.metadata
    );

  const executionData =
    asRecord(
      metadata
        .executionData
    );

  return {
    predictionId:
      asString(
        metadata
          .predictionId
      ) ??
      asString(
        executionData
          .predictionId
      ),

    fixtureId:
      asString(
        metadata
          .fixtureId
      ) ??
      asString(
        executionData
          .fixtureId
      ),

    correct:
      asBoolean(
        metadata
          .correct
      ) ??
      asBoolean(
        executionData
          .correct
      ),

    result:
      asString(
        metadata
          .result
      ) ??
      asString(
        executionData
          .result
      ),

    modelVersion:
      asString(
        metadata
          .modelVersion
      ) ??
      asString(
        executionData
          .modelVersion
      ),

    primaryMarketCategory:
      asString(
        metadata
          .primaryMarketCategory
      ) ??
      asString(
        executionData
          .primaryMarketCategory
      ),

    primaryPick:
      asString(
        metadata
          .primaryPick
      ) ??
      asString(
        executionData
          .primaryPick
      ),

    primaryQualified:
      asBoolean(
        metadata
          .primaryQualified
      ) ??
      asBoolean(
        executionData
          .primaryQualified
      ),

    primaryConfidence:
      asNumber(
        metadata
          .primaryConfidence
      ) ??
      asNumber(
        executionData
          .primaryConfidence
      ),

    canonicalConfidence:
      asNumber(
        metadata
          .canonicalConfidence
      ) ??
      asNumber(
        executionData
          .canonicalConfidence
      ),

    confidence:
      asNumber(
        metadata
          .confidence
      ) ??
      asNumber(
        executionData
          .confidence
      ),

    completedAt:
      asString(
        data.completedAt
      ),
  };
}

function buildGroupStats(
  key:
    string,

  records:
    PredictionLearningRecord[]
): CalibrationGroupStats {
  const evaluable =
    records.filter(
      (
        record
      ) =>
        typeof record.correct ===
          "boolean"
    );

  const correct =
    evaluable.filter(
      (
        record
      ) =>
        record.correct ===
        true
    ).length;

  const incorrect =
    evaluable.length -
    correct;

  const confidenceRecords =
    evaluable
      .map(
        (
          record
        ) => ({
          correct:
            record.correct as boolean,

          confidence:
            getConfidence(
              record
            ),
        })
      )
      .filter(
        (
          item
        ): item is {
          correct:
            boolean;

          confidence:
            number;
        } =>
          typeof item.confidence ===
            "number"
      );

  const confidences =
    confidenceRecords.map(
      (
        item
      ) =>
        item.confidence
    );

  const calibrationErrors =
    confidenceRecords.map(
      (
        item
      ) =>
        getCalibrationError(
          item.correct,
          item.confidence
        )
    );

  const highConfidence =
    confidenceRecords.filter(
      (
        item
      ) =>
        item.confidence >=
        75
    );

  const highConfidenceFailures =
    highConfidence.filter(
      (
        item
      ) =>
        !item.correct
    ).length;

  return {
    key,

    total:
      evaluable.length,

    correct,

    incorrect,

    accuracy:
      percentage(
        correct,
        evaluable.length
      ),

    averageConfidence:
      average(
        confidences
      ),

    averageCalibrationError:
      average(
        calibrationErrors
      ),

    highConfidencePredictions:
      highConfidence.length,

    highConfidenceFailures,

    highConfidenceFailureRate:
      percentage(
        highConfidenceFailures,
        highConfidence.length
      ),
  };
}

function groupBy(
  records:
    PredictionLearningRecord[],

  selector:
    (
      record:
        PredictionLearningRecord
    ) =>
      string
): Map<
  string,
  PredictionLearningRecord[]
> {
  const groups =
    new Map<
      string,
      PredictionLearningRecord[]
    >();

  for (
    const record
    of records
  ) {
    const key =
      selector(
        record
      );

    const existing =
      groups.get(
        key
      ) ??
      [];

    existing.push(
      record
    );

    groups.set(
      key,
      existing
    );
  }

  return groups;
}

export async function getPredictionCalibrationSummary(
  options?: {
    limit?:
      number;
  }
): Promise<
  PredictionCalibrationSummary
> {
  const limit =
    normalizeLimit(
      options
        ?.limit
    );

  const snapshot =
    await adminDb
      .collection(
        COLLECTION
      )
      .where(
        "agent",
        "==",
        "prediction"
      )
      .where(
        "recommendationType",
        "==",
        "prediction-settlement"
      )
      .limit(
        limit
      )
      .get();

  const records =
    snapshot.docs.map(
      (
        document
      ) =>
        toPredictionLearningRecord(
          document.data() as Record<
            string,
            unknown
          >
        )
    );

  const evaluable =
    records.filter(
      (
        record
      ) =>
        typeof record.correct ===
          "boolean"
    );

  const qualified =
    evaluable.filter(
      (
        record
      ) =>
        record
          .primaryQualified ===
        true
    );

  const legacy =
    evaluable.filter(
      (
        record
      ) =>
        !record
          .primaryMarketCategory ||
        !record
          .primaryPick
    );

  const overallStats =
    buildGroupStats(
      "overall",
      evaluable
    );

  const marketGroups =
    groupBy(
      evaluable,
      (
        record
      ) =>
        record
          .primaryMarketCategory ??
        "Legacy / Unknown"
    );

  const modelGroups =
    groupBy(
      evaluable,
      (
        record
      ) =>
        record
          .modelVersion ??
        "Unknown"
    );

  const byMarketCategory =
    Array.from(
      marketGroups.entries()
    )
      .map(
        (
          [
            key,
            group,
          ]
        ) =>
          buildGroupStats(
            key,
            group
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          second.total -
          first.total
      );

  const byModelVersion =
    Array.from(
      modelGroups.entries()
    )
      .map(
        (
          [
            key,
            group,
          ]
        ) =>
          buildGroupStats(
            key,
            group
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          second.total -
          first.total
      );

  const sampleWarnings:
    string[] = [];

  if (
    evaluable.length <
    30
  ) {
    sampleWarnings.push(
      "Overall prediction sample size is below 30. Accuracy and calibration results should be treated as preliminary."
    );
  }

  for (
    const group
    of byMarketCategory
  ) {
    if (
      group.total <
      20
    ) {
      sampleWarnings.push(
        `Market category "${group.key}" has only ${group.total} settled prediction(s). Do not use this sample alone for production-model decisions.`
      );
    }
  }

  for (
    const group
    of byModelVersion
  ) {
    if (
      group.total <
      30
    ) {
      sampleWarnings.push(
        `Model version "${group.key}" has only ${group.total} settled prediction(s). Performance conclusions remain preliminary.`
      );
    }
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    totalPredictionRecords:
      records.length,

    evaluablePredictions:
      evaluable.length,

    qualifiedPredictions:
      qualified.length,

    legacyPredictions:
      legacy.length,

    overall: {
      correct:
        overallStats.correct,

      incorrect:
        overallStats.incorrect,

      accuracy:
        overallStats.accuracy,

      averageConfidence:
        overallStats
          .averageConfidence,

      averageCalibrationError:
        overallStats
          .averageCalibrationError,

      highConfidencePredictions:
        overallStats
          .highConfidencePredictions,

      highConfidenceFailures:
        overallStats
          .highConfidenceFailures,

      highConfidenceFailureRate:
        overallStats
          .highConfidenceFailureRate,
    },

    byMarketCategory,

    byModelVersion,

    sampleWarnings,
  };
}