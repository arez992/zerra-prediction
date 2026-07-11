import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export async function GET() {
  try {
    await requireServerAdmin();

    const recommendations = [];

    // Users
    const usersSnap = await adminDb.collection("users").get();
    const totalUsers = usersSnap.size;

    // Payments
    const paymentsSnap = await adminDb.collection("payments").get();

    const payments = paymentsSnap.docs.map((d) => d.data());

    const completedPayments = payments.filter(
      (p: any) => p.status === "completed"
    ).length;

    const failedPayments = payments.filter(
      (p: any) =>
        p.status === "failed" ||
        p.paymentStatus === "failed" ||
        p.paymentStatus === "expired"
    ).length;

    // ------------------------
    // Recommendation Rules
    // ------------------------

    if (totalUsers >= 20) {
      recommendations.push({
        title: "Launch SEO Expansion",
        description:
          "User growth indicates it is time to expand SEO pages.",
        category: "SEO",
        priority: "high",
        confidence: 90,
        expectedImpact: "+25% Organic Traffic",
        source: "Internal Data",
      });
    }

    if (completedPayments === 0 && totalUsers > 5) {
      recommendations.push({
        title: "Improve VIP Conversion",
        description:
          "Users exist but revenue is low. Optimize VIP conversion.",
        category: "Business",
        priority: "critical",
        confidence: 95,
        expectedImpact: "+Revenue",
        source: "Payments",
      });
    }

    if (failedPayments >= 3) {
      recommendations.push({
        title: "Investigate Failed Payments",
        description:
          "Payment failure rate is becoming high.",
        category: "Payments",
        priority: "high",
        confidence: 91,
        expectedImpact: "Higher payment success",
        source: "Payments",
      });
    }

    // Save recommendations

    for (const recommendation of recommendations) {
      await adminDb.collection("ceoRecommendations").add({
        ...recommendation,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      created: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}