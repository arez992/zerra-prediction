import { NextResponse } from "next/server";
import { requireServerAdmin } from "@/lib/serverAdminAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await requireServerAdmin();

    const snapshot = await adminDb
      .collection("ceoMemory")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const memory = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      memory,
      count: memory.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}