import type { Metadata } from "next";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MaintenanceGate from "@/components/MaintenanceGate";
import { VipProvider } from "@/components/providers/VipProvider";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: {
    default: "ZERRA Prediction | AI Football Predictions",
    template: "%s | ZERRA Prediction",
  },
  description:
    "ZERRA Prediction is an AI-powered football prediction platform with premium match analysis, confidence scores, risk levels, value bets, VIP picks, and live football insights.",
  keywords: [
    "football predictions",
    "AI football predictions",
    "soccer predictions",
    "VIP football picks",
    "football betting analysis",
    "match prediction AI",
    "ZERRA Prediction",
  ],
  openGraph: {
    title: "ZERRA Prediction | AI Football Predictions",
    description:
      "Premium AI football predictions, confidence scores, value bets, risk analysis, and VIP picks.",
    siteName: "ZERRA Prediction",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZERRA Prediction | AI Football Predictions",
    description:
      "AI-powered football predictions with premium analysis and VIP picks.",
  },
};

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  const isAdminRoute = false;

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <VipProvider>
          <Navbar />

          {isAdminRoute ? (
            children
          ) : (
            <MaintenanceGate>{children}</MaintenanceGate>
          )}

          <Footer />
        </VipProvider>

        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics
            gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
          />
        )}
      </body>
    </html>
  );
}