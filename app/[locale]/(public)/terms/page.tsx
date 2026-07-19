import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-14 text-[#102117] md:px-6">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[1.75rem] border border-[#dce8df] bg-white p-7 md:p-10">
          <div className="inline-flex rounded-full bg-[#eaf7ef] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#139653]">
            Legal
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
            Terms of Service
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#758179]">
            These terms explain the general conditions for using ZERRA
            Prediction and its football analysis services.
          </p>

          <div className="mt-8 grid gap-5">
            <LegalCard
              title="Informational Use"
              text="ZERRA Prediction provides AI-generated football analysis, confidence scores, risk indicators, and prediction insights for informational and entertainment purposes only."
            />

            <LegalCard
              title="No Guaranteed Results"
              text="Predictions are not guaranteed results. Football outcomes are uncertain, and users are responsible for their own decisions."
            />

            <LegalCard
              title="VIP Access"
              text="VIP access provides premium analysis and additional insights, but does not guarantee profit, success, or betting outcomes."
            />

            <LegalCard
              title="Responsible Use"
              text="By using ZERRA, you agree to use the platform responsibly and comply with your local laws and regulations."
            />
          </div>

          <div className="mt-9 border-t border-[#e7eee9] pt-6">
            <Link
              href="/en"
              className="inline-flex rounded-xl bg-[#139653] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0d6f3d]"
            >
              Back Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function LegalCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e2ebe5] bg-[#fbfdfb] p-5">
      <h2 className="text-base font-black text-[#102117]">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-7 text-[#66756c]">
        {text}
      </p>
    </div>
  );
}