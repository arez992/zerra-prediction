import type { Metadata } from "next";

import VipPredictionDetail from "@/components/vip/VipPredictionDetail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKurdish = locale === "ku";

  return {
    title: isKurdish
      ? "پێشبینی VIP | ZERRA"
      : "VIP Prediction | ZERRA",
    description: isKurdish
      ? "پەڕەی پارێزراوی پێشبینی و شیکاری تایبەتی ZERRA VIP."
      : "Protected ZERRA VIP prediction and premium football analysis.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function VipPredictionPage({
  params,
}: PageProps) {
  const { locale, id } = await params;

  return (
    <VipPredictionDetail
      locale={locale === "ku" ? "ku" : "en"}
      predictionId={id}
    />
  );
}