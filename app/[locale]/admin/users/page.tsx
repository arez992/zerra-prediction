import Link from "next/link";
import AdminGate from "@/components/admin/AdminGate";

async function getUsers() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerra-prediction.vercel.app";

    const res = await fetch(`${siteUrl}/api/admin/users`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success) return data.users;

    return [];
  } catch {
    return [];
  }
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <AdminGate>
      <main className="mx-auto max-w-7xl px-5 py-12 text-white">
        <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
          ← Back to Admin
        </Link>

        <h1 className="mt-6 text-5xl font-black">Users</h1>

        <p className="mt-4 text-white/60">
          View registered users, VIP status, plans, and expiration dates.
        </p>

        <section className="mt-10 grid gap-4">
          {users.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              No users found.
            </div>
          ) : (
            users.map((user: any) => (
              <article
                key={user.id}
                className="rounded-3xl border border-white/10 bg-[#101827] p-6"
              >
                <div className="grid gap-4 md:grid-cols-5">
                  <Info title="Email" value={user.email || "Unknown"} />
                  <Info title="VIP" value={user.isVip ? "Active" : "Free"} />
                  <Info title="Plan" value={user.plan || "Free"} />
                  <Info title="Expires" value={user.expiresAt || "—"} />
                  <Info title="User ID" value={user.id} />
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </AdminGate>
  );
}

function Info({ title, value }: { title: string | number; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase text-white/40">{title}</p>
      <p className="mt-1 break-words font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}