import { useEffect, useState } from "react";
import { CircleAlert, Store } from "lucide-react";
import { useParams } from "react-router-dom";
import { shopOwnerApi } from "../services/api";

const defaults = {
  storefrontEnabled: true,
  storefrontDescription: "",
  storefrontLogoUrl: "",
  storefrontBrandColor: "#047857",
  storefrontContactEmail: "",
  storefrontContactPhone: "",
  storefrontAddress: "",
};

function ShopSettings() {
  const { slug = "" } = useParams();
  const [settings, setSettings] = useState(defaults);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    shopOwnerApi.getStorefrontSettings(slug)
      .then((result) => {
        if (active) setSettings({ ...defaults, ...result });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load storefront settings.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  async function saveSettings(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const saved = await shopOwnerApi.updateStorefrontSettings(slug, {
        ...settings,
        storefrontLogoUrl: settings.storefrontLogoUrl || null,
        storefrontContactEmail: settings.storefrontContactEmail || null,
        storefrontContactPhone: settings.storefrontContactPhone || null,
        storefrontAddress: settings.storefrontAddress || null,
      });
      setSettings({ ...defaults, ...saved });
      setNotice("Storefront settings saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save storefront settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading storefront settings…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="section-kicker">SHOP EXPERIENCE</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Storefront settings</h1>
        <p className="mt-2 text-sm text-slate-600">Customize your shop’s public identity. Disabling the storefront will not disable your private workspace.</p>
      </header>
      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><CircleAlert size={18} />{error}</div>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p>}

      <form onSubmit={saveSettings} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
          <input type="checkbox" checked={settings.storefrontEnabled} onChange={(event) => update("storefrontEnabled", event.target.checked)} />
          <span>
            <strong className="block text-sm text-slate-900">Enable public storefront</strong>
            <small className="mt-1 block text-slate-500">When disabled, customers cannot browse, sign in, or place orders. Owner workspace access is unchanged.</small>
          </span>
        </label>

        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          <span>Store description</span>
          <textarea maxLength={500} rows={3} value={settings.storefrontDescription} onChange={(event) => update("storefrontDescription", event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-3" />
        </label>
        <Field label="Logo URL">
          <input type="url" maxLength={500} value={settings.storefrontLogoUrl || ""} onChange={(event) => update("storefrontLogoUrl", event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand color">
            <input type="color" value={settings.storefrontBrandColor} onChange={(event) => update("storefrontBrandColor", event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 p-1" />
          </Field>
          <Field label="Contact email">
            <input type="email" value={settings.storefrontContactEmail || ""} onChange={(event) => update("storefrontContactEmail", event.target.value)} />
          </Field>
          <Field label="Contact phone">
            <input maxLength={80} value={settings.storefrontContactPhone || ""} onChange={(event) => update("storefrontContactPhone", event.target.value)} />
          </Field>
          <Field label="Shop address">
            <input maxLength={500} value={settings.storefrontAddress || ""} onChange={(event) => update("storefrontAddress", event.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <a className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:underline" href={`/shop/${slug}/customer`} target="_blank" rel="noreferrer">
            <Store size={16} /> Preview storefront
          </a>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            {isSaving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children.props.className ? children : (
        <input {...children.props} className="w-full rounded-xl border border-slate-300 px-3.5 py-3" />
      )}
    </label>
  );
}

export default ShopSettings;
