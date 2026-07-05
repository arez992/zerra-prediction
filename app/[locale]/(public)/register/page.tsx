export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-7xl items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-[#D4AF37]/30 bg-white/5 p-8">

        <h1 className="text-center text-4xl font-black text-white">
          Create Account
        </h1>

        <p className="mt-3 text-center text-white/60">
          Join ZERRA Prediction today
        </p>

        <input
          placeholder="Full Name"
          className="mt-8 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <input
          placeholder="Email"
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <input
          type="password"
          placeholder="Password"
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white"
        />

        <button className="mt-8 w-full rounded-full bg-[#D4AF37] py-4 font-bold text-black">
          Create Account
        </button>

        <p className="mt-6 text-center text-white/60">
          Already have an account?
        </p>

        <a
          href="/en/login"
          className="mt-3 block text-center font-bold text-[#D4AF37]"
        >
          Login
        </a>

      </div>
    </main>
  );
}