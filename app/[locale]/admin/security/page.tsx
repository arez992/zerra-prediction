import Link from "next/link";
import { cookies } from "next/headers";


async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

async function getSecurity() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/security`, {
      cache: "no-store",
      headers: {
        Cookie: await getCookieHeader(),
      },
    });

    const data = await res.json();

    if (data?.success) return data.security;

    return null;
  } catch {
    return null;
  }
}

export default async function AdminSecurityPage() {
  const security = await getSecurity();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†’ Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Security Dashboard</h1>

      <p className="mt-4 text-white/60">
        Monitor administrator access, users, payments, and important platform
        security controls.
      </p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SecurityCard
          title="Admin Users"
          value={security?.adminUsers ?? 0}
          status="info"
        />

        <SecurityCard
          title="Total Users"
          value={security?.totalUsers ?? 0}
          status="info"
        />

        <SecurityCard
          title="Active VIP"
          value={security?.activeVipUsers ?? 0}
          status="success"
        />

        <SecurityCard
          title="Failed Payments"
          value={security?.failedPayments ?? 0}
          status={(security?.failedPayments ?? 0) > 0 ? "danger" : "success"}
        />
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SecurityCard
          title="Pending Payments"
          value={security?.pendingPayments ?? 0}
          status={(security?.pendingPayments ?? 0) > 0 ? "warning" : "success"}
        />

        <SecurityCard
          title="Maintenance"
          value={security?.maintenanceMode ? "Enabled" : "Disabled"}
          status={security?.maintenanceMode ? "warning" : "success"}
        />

        <SecurityCard
          title="Registration"
          value={security?.registrationEnabled ? "Enabled" : "Disabled"}
          status={security?.registrationEnabled ? "success" : "warning"}
        />

        <SecurityCard
          title="Payments"
          value={security?.paymentsEnabled ? "Enabled" : "Disabled"}
          status={security?.paymentsEnabled ? "success" : "danger"}
        />
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SecurityCard
          title="AI System"
          value={security?.aiEnabled ? "Enabled" : "Disabled"}
          status={security?.aiEnabled ? "success" : "warning"}
        />

        <SecurityCard
          title="Checked At"
          value={formatDate(security?.checkedAt)}
          status="info"
        />
      </section>
    </main>
  );
}

function formatDate(value?: string) {
  if (!value) return "â€”";

  return new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SecurityCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string | number;
  status: "success" | "warning" | "danger" | "info";
}) {
  const statusClasses = {
    success: "border-green-500/30 bg-green-500/5 text-green-300",
    warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-300",
    danger: "border-red-500/30 bg-red-500/5 text-red-300",
    info: "border-white/10 bg-[#101827] text-[#D4AF37]",
  };

  return (
    <article
      className={`rounded-[2rem] border p-6 shadow-xl ${statusClasses[status]}`}
    >
      <p className="text-sm font-bold text-white/50">{title}</p>

      <p className="mt-3 break-words text-3xl font-black">{value}</p>
    </article>
  );
}
