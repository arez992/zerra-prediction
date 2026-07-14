import { NextResponse } from "next/server";
import { requireServerAdmin } from "@/lib/serverAdminAuth";
import { runZAOSCEOSmokeTest } from "@/lib/ai/ceo/tests/zaosSmokeTest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    await requireServerAdmin();

    const result = await runZAOSCEOSmokeTest();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to execute ZAOS smoke test.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message === "Unauthorized admin access"
            ? 401
            : 500,
      }
    );
  }
}