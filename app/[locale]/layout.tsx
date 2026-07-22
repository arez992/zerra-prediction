import type {
  Metadata,
} from "next";

import "../globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MaintenanceGate from "@/components/MaintenanceGate";

import {
  VipProvider,
} from "@/components/providers/VipProvider";

import AuthSessionProvider from "@/components/providers/AuthSessionProvider";

import {
  GoogleAnalytics,
} from "@next/third-parties/google";

export const metadata:
  Metadata = {
  metadataBase:
    new URL(
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com"
    ),

  title: {
    default:
      "ZERRA Prediction | AI Football Predictions",

    template:
      "%s | ZERRA Prediction",
  },

  description:
    "ZERRA Prediction is an AI-powered football prediction platform with real match analysis, confidence signals, risk assessment, public insights, and premium VIP intelligence.",

  keywords: [
    "football predictions",
    "AI football predictions",
    "soccer predictions",
    "VIP football picks",
    "football analysis",
    "match prediction AI",
    "ZERRA Prediction",
  ],

  icons: {
    icon: [
      {
        url:
          "/brand/zerra-logo.png",

        type:
          "image/png",
      },
    ],

    shortcut:
      "/brand/zerra-logo.png",

    apple:
      "/brand/zerra-logo.png",
  },

  openGraph: {
    title:
      "ZERRA Prediction | AI Football Predictions",

    description:
      "AI-powered football predictions, match analysis, confidence signals, risk assessment, and premium VIP intelligence.",

    siteName:
      "ZERRA Prediction",

    type:
      "website",

    images: [
      {
        url:
          "/brand/zerra-logo.png",

        alt:
          "ZERRA Prediction",
      },
    ],
  },

  twitter: {
    card:
      "summary_large_image",

    title:
      "ZERRA Prediction | AI Football Predictions",

    description:
      "AI-powered football predictions and premium match intelligence.",

    images: [
      "/brand/zerra-logo.png",
    ],
  },
};

type LocaleLayoutProps = {
  children:
    React.ReactNode;

  params:
    Promise<{
      locale:
        string;
    }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const {
    locale,
  } =
    await params;

  return (
    <html
      lang={locale}
      dir={
        locale ===
        "ar"
          ? "rtl"
          : "ltr"
      }
    >
      <body className="min-h-screen bg-[#f7faf8] text-[#102117]">
        <AuthSessionProvider>
          <VipProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />

              <div className="flex-1">
                <MaintenanceGate>
                  {children}
                </MaintenanceGate>
              </div>

              <Footer />
            </div>
          </VipProvider>
        </AuthSessionProvider>

        {process.env
          .NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics
            gaId={
              process.env
                .NEXT_PUBLIC_GA_MEASUREMENT_ID
            }
          />
        )}
      </body>
    </html>
  );
}
