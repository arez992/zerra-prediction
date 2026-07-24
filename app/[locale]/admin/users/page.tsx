import Link from "next/link";
import { cookies } from "next/headers";
import UserActions from "@/components/admin/UserActions";


async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

async function getUsers() {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://zerraprediction.com";

    const res = await fetch(`${siteUrl}/api/admin/users`, {
      cache: "no-store",
      headers: {
        Cookie: await getCookieHeader(),
      },
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
    <main className="mx-auto max-w-7xl px-5 py-12 text-white">
      <Link href="/en/admin" className="text-sm font-bold text-[#D4AF37]">
        â†’ Back to Admin
      </Link>

      <h1 className="mt-6 text-5xl font-black">Users</h1>

      <p className="mt-4 text-white/60">
        View registered users, VIP status, plans, roles, and expiration dates.
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
              <div className="grid gap-4 md:grid-cols-6">
                <Info title="Email" value={user.email || "Unknown"} />
                <Info title="Role" value={user.role || "user"} />
                <Info title="VIP" value={user.isVip ? "Active" : "Free"} />
                <Info title="Plan" value={user.plan || "Free"} />
                <Info title="Expires" value={user.vipExpireAt || "â€”"} />
                <Info title="User ID" value={user.id} />
              </div>

              <UserActions user={user} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function Info({
  title,
  value,
}: {
  title: string | number;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-xs uppercase text-white/40">{title}</p>
      <p className="mt-1 break-words font-black text-[#D4AF37]">{value}</p>
    </div>
  );
}
