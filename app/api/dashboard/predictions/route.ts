import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculatePrediction,
} from "@/lib/ai/prediction";

import {
  getServerVipUser,
} from "@/lib/serverVipAuth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const MAX_FIXTURES =
  500;

type RequestBody = {
  fixtures?: unknown;
};

function normalizeFixtures(
  value: unknown
): any[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        fixture
      ) =>
        fixture &&
        typeof fixture ===
          "object"
    )
    .slice(
      0,
      MAX_FIXTURES
    );
}

function getFixtureId(
  fixture: any
): string {
  return String(
    fixture
      ?.fixture
      ?.id ??
      ""
  ).trim();
}

export async function POST(
  request: NextRequest
) {
  try {
    const viewer =
      await getServerVipUser();

    const isVip =
      viewer?.isVip ===
        true ||
      viewer?.isAdmin ===
        true;

    const body =
      (await request.json()) as
        RequestBody;

    const fixtures =
      normalizeFixtures(
        body.fixtures
      );

    const predictions:
      Record<
        string,
        {
          risk: string;
          riskScore: number;
          prediction?: string;
          marketCategory?: string;
        }
      > =
        {};

    for (
      const fixture
      of fixtures
    ) {
      const fixtureId =
        getFixtureId(
          fixture
        );

      if (
        !fixtureId
      ) {
        continue;
      }

      try {
        const result =
          calculatePrediction(
            fixture
          );

        const base = {
          risk:
            result.risk,

          riskScore:
            result.riskScore,
        };

        if (
          isVip
        ) {
          predictions[
            fixtureId
          ] = {
            ...base,

            prediction:
              result
                .vipPrediction
                .primaryPrediction
                .pick ||
              result
                .vipPrediction
                .finalPrediction,

            marketCategory:
              result
                .vipPrediction
                .primaryPrediction
                .category,
          };
        } else {
          predictions[
            fixtureId
          ] =
            base;
        }
      } catch (
        error
      ) {
        console.error(
          "[DASHBOARD_LIGHT_PREDICTION_ITEM_ERROR]",
          {
            fixtureId,
            error:
              error instanceof
                Error
                ? error.message
                : "Prediction calculation failed.",
          }
        );
      }
    }

    return NextResponse.json(
      {
        success:
          true,

        access:
          isVip
            ? "vip"
            : "free",

        count:
          Object.keys(
            predictions
          ).length,

        predictions,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[DASHBOARD_LIGHT_PREDICTIONS_ERROR]",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Unable to calculate dashboard predictions.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }
}
