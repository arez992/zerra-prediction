import Link from "next/link";
import { requireServerAdmin } from "@/lib/serverAdminAuth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireServerAdmin();
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-5 py-14 text-center text-white">
        <h1 className="text-4xl font-black">Admin Access Required</h1>

        <p className="mt-4 text-white/60">
          You do not have permission to view this page.
        </p>

        <Link
          href="/en/login"
          className="mt-8 inline-block rounded-full bg-[#D4AF37] px-6 py-3 font-black text-black"
        >
          Login as Admin
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}