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
  await params;

  return {
    title: "VIP Prediction | ZERRA",
    description: "Protected ZERRA VIP prediction and premium football analysis.",
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
      locale="en"
      predictionId={id}
    />
  );
}