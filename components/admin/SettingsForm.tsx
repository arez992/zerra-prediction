"use client";

import { useState } from "react";

export default function SettingsForm({ settings }: { settings: any }) {
  const [form, setForm] = useState({
    siteName: settings?.siteName || "ZERRA Prediction",
    heroTitle: settings?.heroTitle || "",
    heroSubtitle: settings?.heroSubtitle || "",

    weeklyPrice: settings?.weeklyPrice ?? 9,
    monthlyPrice: settings?.monthlyPrice ?? 19,
    quarterlyPrice: settings?.quarterlyPrice ?? 49,
    currency: settings?.currency || "USDT",

    maintenanceMode: settings?.maintenanceMode ?? false,
    registrationEnabled: settings?.registrationEnabled ?? true,
    vipEnabled: settings?.vipEnabled ?? true,
    paymentsEnabled: settings?.paymentsEnabled ?? true,
    aiEnabled: settings?.aiEnabled ?? true,
  });

  const [loading, setLoading] = useState(false);

  function updateField(name: string, value: any) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveSettings() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to save settings");
        return;
      }

      alert("Settings saved ✅");
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#101827] p-6 shadow-xl">
      <h2 className="text-2xl font-black text-white">Edit Settings</h2>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Input label="Site Name" value={form.siteName} onChange={(v) => updateField("siteName", v)} />
        <Input label="Currency" value={form.currency} onChange={(v) => updateField("currency", v)} />

        <Input label="Hero Title" value={form.heroTitle} onChange={(v) => updateField("heroTitle", v)} />
        <Input label="Hero Subtitle" value={form.heroSubtitle} onChange={(v) => updateField("heroSubtitle", v)} />

        <Input label="Weekly Price" type="number" value={form.weeklyPrice} onChange={(v) => updateField("weeklyPrice", Number(v))} />
        <Input label="Monthly Price" type="number" value={form.monthlyPrice} onChange={(v) => updateField("monthlyPrice", Number(v))} />
        <Input label="Quarterly Price" type="number" value={form.quarterlyPrice} onChange={(v) => updateField("quarterlyPrice", Number(v))} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Toggle label="Maintenance" checked={form.maintenanceMode} onChange={(v) => updateField("maintenanceMode", v)} />
        <Toggle label="Registration" checked={form.registrationEnabled} onChange={(v) => updateField("registrationEnabled", v)} />
        <Toggle label="VIP" checked={form.vipEnabled} onChange={(v) => updateField("vipEnabled", v)} />
        <Toggle label="Payments" checked={form.paymentsEnabled} onChange={(v) => updateField("paymentsEnabled", v)} />
        <Toggle label="AI" checked={form.aiEnabled} onChange={(v) => updateField("aiEnabled", v)} />
      </div>

      <button
        onClick={saveSettings}
        disabled={loading}
        className="mt-8 rounded-full bg-[#D4AF37] px-7 py-3 font-black text-black disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-white/50">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-bold text-white outline-none focus:border-[#D4AF37]"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border p-4 text-left transition ${
        checked
          ? "border-[#D4AF37]/60 bg-[#D4AF37]/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <p className="text-sm font-bold text-white/50">{label}</p>
      <p className="mt-2 text-xl font-black text-[#D4AF37]">
        {checked ? "Enabled" : "Disabled"}
      </p>
    </button>
  );
}