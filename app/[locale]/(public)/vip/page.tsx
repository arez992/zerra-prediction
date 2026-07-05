export default function VipPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-14">
      <h1 className="text-5xl font-black text-white">
        Become a VIP Member
      </h1>

      <p className="mt-4 max-w-2xl text-white/70">
        Unlock all AI predictions, confidence scores, live predictions,
        and daily premium picks.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-[#D4AF37]">
            Weekly
          </h2>

          <p className="mt-3 text-4xl font-black text-white">
            9 USDT
          </p>

          <p className="mt-4 text-white/70">
            7 Days Access
          </p>

          <button className="mt-8 w-full rounded-full bg-[#D4AF37] py-3 font-bold text-black">
            Buy Now
          </button>
        </div>

        <div className="rounded-3xl border border-[#D4AF37] bg-[#D4AF37]/10 p-8">
          <h2 className="text-2xl font-bold text-[#D4AF37]">
            Monthly
          </h2>

          <p className="mt-3 text-4xl font-black text-white">
            19 USDT
          </p>

          <p className="mt-4 text-white/70">
            Best Value
          </p>

          <button className="mt-8 w-full rounded-full bg-[#D4AF37] py-3 font-bold text-black">
            Buy Now
          </button>
        </div>

        <div className="rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-[#D4AF37]">
            Quarterly
          </h2>

          <p className="mt-3 text-4xl font-black text-white">
            49 USDT
          </p>

          <p className="mt-4 text-white/70">
            Save 20%
          </p>

          <button className="mt-8 w-full rounded-full bg-[#D4AF37] py-3 font-bold text-black">
            Buy Now
          </button>
        </div>

      </div>
    </main>
  );
}