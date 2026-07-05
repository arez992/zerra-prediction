import type { Metadata } from "next";
import "../globals.css";
import { getDictionary, Locale } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ZERRA Prediction",
  description: "AI-powered multi-sport prediction platform with premium analytics.",
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><Navbar locale={locale} dict={dict} />{children}</body></html>;
}
