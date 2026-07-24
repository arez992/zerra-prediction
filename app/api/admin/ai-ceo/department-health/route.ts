import {
  NextResponse,
} from "next/server";

import {
  requireServerAdmin,
} from "@/lib/serverAdminAuth";

import {
  runDepartmentHealthTest,
} from "@/lib/ai/ceo/tests/departmentHealthTest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    await requireServerAdmin();

    const result =
      await runDepartmentHealthTest();

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to execute department health test.";

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
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
