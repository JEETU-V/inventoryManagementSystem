import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Activity,
  Building2,
  CircleAlert,
  CircleCheck,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { platformAdminApi } from "../services/api";

const sectionContent = {
  overview: {
    title: "Platform administration",
    description: "Manage platform operations without entering business workspaces.",
  },
  owners: {
    title: "Shop owner accounts",
    description: "View owner contact and account status. Passwords and business records are never shown.",
  },
  businesses: {
    title: "Business registration",
    description: "Review registered workspaces, their owners, enrollment dates, plans, and access status.",
  },
  plans: {
    title: "Subscription plans",
    description: "Maintain the platform plan catalog and assign plans manually. Billing is not enabled.",
  },
  status: {
    title: "Account status",
    description: "Suspend or reactivate owner accounts and workspaces. Suspension preserves all records.",
  },
  usage: {
    title: "Platform usage summaries",
    description: "Aggregated enrollment and account totals only; no tenant sales or operational data.",
  },
  health: {
    title: "Technical health",
    description: "Check the platform API and database connection without exposing infrastructure secrets.",
  },
  support: {
    title: "Support and audit logs",
    description: "Track internal support cases and review a read-only history of administrative changes.",
  },
  audit: {
    title: "Support and audit logs",
    description: "Track internal support cases and review a read-only history of administrative changes.",
  },
};

const emptyPlan = {
  name: "",
  description: "",
  monthlyPrice: "",
  annualPrice: "",
  isActive: true,
};

const emptyCase = {
  businessId: "",
  subject: "",
  description: "",
  priority: "normal",
};

function PlatformAdmin() {
  const location = useLocation();
  const section = location.pathname.split("/")[2] || "overview";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [planDraft, setPlanDraft] = useState(emptyPlan);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [caseDraft, setCaseDraft] = useState(emptyCase);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSection() {
      setIsLoading(true);
      setError("");
      setData(null);
      try {
        let result;
        if (section === "overview" || section === "usage") {
          result = await platformAdminApi.summary();
        } else if (section === "businesses") {
          const [summary, plans] = await Promise.all([
            platformAdminApi.summary(),
            platformAdminApi.plans(),
          ]);
          result = { ...summary, plans };
        } else if (section === "owners") {
          result = await platformAdminApi.owners();
        } else if (section === "plans") {
          result = await platformAdminApi.plans();
        } else if (section === "status") {
          const [owners, summary, plans] = await Promise.all([
            platformAdminApi.owners(),
            platformAdminApi.summary(),
            platformAdminApi.plans(),
          ]);
          result = { owners, businesses: summary.businesses, plans };
        } else if (section === "health") {
          result = await platformAdminApi.health();
        } else if (section === "support" || section === "audit") {
          const [supportCases, auditLogs, summary] = await Promise.all([
            platformAdminApi.supportCases(),
            platformAdminApi.auditLogs(),
            platformAdminApi.summary(),
          ]);
          result = { supportCases, auditLogs, businesses: summary.businesses };
        } else {
          throw new Error("This platform section does not exist.");
        }
        if (active) setData(result);
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || "Unable to load platform data.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadSection();
    return () => {
      active = false;
    };
  }, [section, refreshKey]);

  const title = sectionContent[section]?.title || "Platform administration";
  const description = sectionContent[section]?.description || "";

  async function performAction(action) {
    setActionError("");
    setIsSaving(true);
    try {
      await action();
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Unable to complete this platform action.");
    } finally {
      setIsSaving(false);
    }
  }

  async function savePlan(event) {
    event.preventDefault();
    await performAction(async () => {
      const payload = {
        ...planDraft,
        monthlyPrice: Number(planDraft.monthlyPrice),
        annualPrice: Number(planDraft.annualPrice),
      };
      if (editingPlanId) {
        await platformAdminApi.updatePlan(editingPlanId, payload);
      } else {
        await platformAdminApi.createPlan(payload);
      }
      setPlanDraft(emptyPlan);
      setEditingPlanId(null);
    });
  }

  async function saveCase(event) {
    event.preventDefault();
    await performAction(async () => {
      await platformAdminApi.createSupportCase({
        ...caseDraft,
        businessId: caseDraft.businessId ? Number(caseDraft.businessId) : null,
      });
      setCaseDraft(emptyCase);
    });
  }

  function changeOwnerStatus(owner) {
    const nextStatus = !owner.isActive;
    const verb = nextStatus ? "reactivate" : "suspend";
    if (!window.confirm(`Are you sure you want to ${verb} ${owner.name}'s account?`)) return;
    performAction(() => platformAdminApi.updateOwnerStatus(owner.id, nextStatus));
  }

  function changeBusinessStatus(business) {
    const status = business.status === "active" ? "suspended" : "active";
    const verb = status === "active" ? "reactivate" : "suspend";
    if (!window.confirm(`Are you sure you want to ${verb} ${business.name}? Existing records will be preserved.`)) return;
    performAction(() => platformAdminApi.updateBusinessStatus(business.id, status));
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">PRIVACY-RESTRICTED PLATFORM CONSOLE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => setRefreshKey((current) => current + 1)}
          type="button"
          disabled={isLoading || isSaving}
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {error && <Notice tone="error">{error}</Notice>}
      {actionError && <Notice tone="error">{actionError}</Notice>}
      {isLoading && !data && <p className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">Loading platform information…</p>}

      {(section === "overview" || section === "usage") && data && (
        <UsageSummary metrics={data.metrics} businesses={data.businesses} showBusinesses={section === "overview"} />
      )}
      {section === "owners" && Array.isArray(data) && (
        <OwnersTable owners={data} onChangeStatus={changeOwnerStatus} isSaving={isSaving} />
      )}
      {section === "businesses" && data && (
        <BusinessTable
          businesses={data.businesses}
          plans={data.plans}
          onChangeStatus={changeBusinessStatus}
          onAssignPlan={(businessId, planId) => performAction(() => platformAdminApi.assignBusinessPlan(businessId, planId))}
          isSaving={isSaving}
          showPlan
        />
      )}
      {section === "plans" && Array.isArray(data) && (
        <PlansPanel
          plans={data}
          draft={planDraft}
          setDraft={setPlanDraft}
          editingId={editingPlanId}
          setEditingId={setEditingPlanId}
          onSave={savePlan}
          isSaving={isSaving}
        />
      )}
      {section === "status" && data && (
        <div className="space-y-7">
          <OwnersTable owners={data.owners} onChangeStatus={changeOwnerStatus} isSaving={isSaving} />
          <BusinessTable businesses={data.businesses} plans={data.plans} onChangeStatus={changeBusinessStatus}
            onAssignPlan={(businessId, planId) => performAction(() => platformAdminApi.assignBusinessPlan(businessId, planId))}
            isSaving={isSaving} showPlan />
        </div>
      )}
      {section === "health" && data && <HealthPanel health={data} />}
      {(section === "support" || section === "audit") && data && (
        <SupportPanel
          cases={data.supportCases}
          auditLogs={data.auditLogs}
          businesses={data.businesses}
          draft={caseDraft}
          setDraft={setCaseDraft}
          onSave={saveCase}
          onUpdateStatus={(caseId, status) => performAction(() => platformAdminApi.updateSupportCaseStatus(caseId, status))}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function UsageSummary({ metrics, businesses, showBusinesses }) {
  const cards = [
    { key: "businesses", label: "Registered businesses", icon: Building2 },
    { key: "ownerAccounts", label: "Shop owner accounts", icon: Users },
    { key: "activeMemberships", label: "Active memberships", icon: Activity },
    { key: "activeBusinesses", label: "Active workspaces", icon: CircleCheck },
    { key: "suspendedBusinesses", label: "Suspended workspaces", icon: ShieldCheck },
    { key: "activeOwnerAccounts", label: "Active owner accounts", icon: Users },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Aggregated platform usage">
        {cards.map(({ key, label, icon: Icon }) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={key}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm">{label}</span>
              <Icon size={18} />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              {(metrics?.[key] ?? 0).toLocaleString()}
            </p>
          </article>
        ))}
      </section>
      <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Usage is aggregated across the platform. This view does not include tenant sales, profit, products, customers, or orders.
      </p>
      {showBusinesses && <BusinessTable businesses={businesses} plans={[]} showPlan={false} readOnly />}
    </>
  );
}

function OwnersTable({ owners = [], onChangeStatus, isSaving }) {
  return (
    <DataTable title="Shop owner accounts" empty="No shop owner accounts have been registered yet."
      columns={["Owner", "Workspaces", "Account status", "Registered", "Action"]}>
      {owners.map((owner) => (
        <tr key={owner.id}>
          <td className="px-5 py-4">
            <p className="font-medium text-slate-900">{owner.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{owner.email}</p>
          </td>
          <td className="px-5 py-4 text-slate-600">{owner.businessCount}</td>
          <td className="px-5 py-4"><StatusBadge active={owner.isActive} /></td>
          <td className="px-5 py-4 text-slate-600">{formatDate(owner.createdAt)}</td>
          <td className="px-5 py-4">
            {owner.isPlatformAdmin
              ? <span className="text-xs text-slate-500">Protected</span>
              : <button
                type="button"
                disabled={isSaving}
                onClick={() => onChangeStatus(owner)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >{owner.isActive ? "Suspend account" : "Reactivate account"}</button>}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function BusinessTable({ businesses = [], plans = [], onChangeStatus, onAssignPlan, isSaving, showPlan = true, readOnly = false }) {
  return (
    <DataTable title="Business registrations" empty="No business workspaces have been registered yet."
      columns={showPlan ? ["Business / owner", "Plan", "Status", "Registered", "Action"] : ["Business / owner", "Status", "Registered", ...(readOnly ? [] : ["Action"])]}>
      {businesses.map((business) => (
        <tr key={business.id}>
          <td className="px-5 py-4">
            <p className="font-medium text-slate-900">{business.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{business.ownerName} · {business.ownerEmail}</p>
            <p className="mt-0.5 text-xs text-slate-400">{business.slug} · {business.businessType}</p>
          </td>
          {showPlan && <td className="px-5 py-4">
            {readOnly ? <span className="text-slate-600">{business.subscriptionPlan || "No plan"}</span> : (
              <select aria-label={`Subscription plan for ${business.name}`} value={business.subscriptionPlanId || ""}
                disabled={isSaving} onChange={(event) => onAssignPlan(business.id, event.target.value || null)}
                className="max-w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs">
                <option value="">No plan</option>
                {plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            )}
          </td>}
          <td className="px-5 py-4"><StatusBadge active={business.status === "active"} /></td>
          <td className="px-5 py-4 text-slate-600">{formatDate(business.createdAt)}</td>
          {!readOnly && <td className="px-5 py-4">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onChangeStatus?.(business)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >{business.status === "active" ? "Suspend workspace" : "Reactivate workspace"}</button>
          </td>}
        </tr>
      ))}
    </DataTable>
  );
}

function PlansPanel({ plans, draft, setDraft, editingId, setEditingId, onSave, isSaving }) {
  function editPlan(plan) {
    setEditingId(plan.id);
    setDraft({
      name: plan.name,
      description: plan.description,
      monthlyPrice: String(plan.monthlyPrice),
      annualPrice: String(plan.annualPrice),
      isActive: plan.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyPlan);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
      <DataTable title="Subscription plans" empty="No plans exist. Add a plan to start assigning subscriptions."
        columns={["Plan", "Monthly", "Annual", "Assigned", "Status", "Action"]}>
        {plans.map((plan) => (
          <tr key={plan.id}>
            <td className="px-5 py-4">
              <p className="font-medium text-slate-900">{plan.name}</p>
              <p className="mt-0.5 max-w-xs text-xs text-slate-500">{plan.description || "No description"}</p>
            </td>
            <td className="px-5 py-4 text-slate-600">{formatMoney(plan.monthlyPrice)}</td>
            <td className="px-5 py-4 text-slate-600">{formatMoney(plan.annualPrice)}</td>
            <td className="px-5 py-4 text-slate-600">{plan.assignedBusinesses}</td>
            <td className="px-5 py-4"><StatusBadge active={plan.isActive} /></td>
            <td className="px-5 py-4">
              <button type="button" onClick={() => editPlan(plan)} className="text-sm font-medium text-blue-700 hover:text-blue-900">Edit</button>
            </td>
          </tr>
        ))}
      </DataTable>

      <form onSubmit={onSave} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-semibold text-slate-900">{editingId ? "Edit plan" : "Create a plan"}</h2>
          <p className="mt-1 text-xs text-slate-500">Prices are catalog values only; no payments are processed.</p>
        </div>
        <Field label="Plan name">
          <input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="Description">
          <textarea maxLength={500} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly price">
            <input required min="0" step="0.01" type="number" value={draft.monthlyPrice} onChange={(event) => setDraft({ ...draft, monthlyPrice: event.target.value })} />
          </Field>
          <Field label="Annual price">
            <input required min="0" step="0.01" type="number" value={draft.annualPrice} onChange={(event) => setDraft({ ...draft, annualPrice: event.target.value })} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          Available for assignment
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={isSaving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            {isSaving ? "Saving…" : editingId ? "Save plan" : "Create plan"}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700">Cancel</button>}
        </div>
      </form>
    </div>
  );
}

function HealthPanel({ health }) {
  const isHealthy = health.status === "ok";
  return (
    <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-xl ${isHealthy ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {isHealthy ? <CircleCheck size={22} /> : <CircleAlert size={22} />}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Platform {isHealthy ? "operational" : "degraded"}</h2>
          <p className="mt-1 text-sm text-slate-500">Last checked {formatDate(health.checkedAt, true)}</p>
        </div>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <HealthValue label="API" value="Responding" good />
        <HealthValue label="Database" value={health.database} good={health.database === "connected"} />
      </dl>
      <p className="mt-5 text-xs text-slate-500">No credentials, hostnames, file paths, or infrastructure configuration are exposed here.</p>
    </section>
  );
}

function HealthValue({ label, value, good }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-1 font-medium capitalize ${good ? "text-emerald-800" : "text-red-700"}`}>{value}</dd>
    </div>
  );
}

function SupportPanel({ cases, auditLogs, businesses, draft, setDraft, onSave, onUpdateStatus, isSaving }) {
  return (
    <div className="space-y-7">
      <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-semibold text-slate-900">Create an internal support case</h2>
          <p className="mt-1 text-xs text-slate-500">Keep case notes limited to support metadata; do not enter customer or inventory details.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Related business (optional)">
            <select value={draft.businessId} onChange={(event) => setDraft({ ...draft, businessId: event.target.value })}>
              <option value="">Platform-wide</option>
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
              {["low", "normal", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Subject">
          <input required maxLength={180} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
        </Field>
        <Field label="Internal notes">
          <textarea required maxLength={5000} rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </Field>
        <button type="submit" disabled={isSaving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
          {isSaving ? "Saving…" : "Create support case"}
        </button>
      </form>

      <DataTable title="Internal support cases" empty="There are no support cases."
        columns={["Case", "Business", "Priority", "Status", "Updated"]}>
        {cases.map((supportCase) => (
          <tr key={supportCase.id}>
            <td className="px-5 py-4">
              <p className="font-medium text-slate-900">#{supportCase.id} · {supportCase.subject}</p>
              <p className="mt-1 max-w-xl whitespace-pre-wrap text-xs text-slate-500">{supportCase.description}</p>
            </td>
            <td className="px-5 py-4 text-slate-600">{supportCase.businessName || "Platform-wide"}</td>
            <td className="px-5 py-4 capitalize text-slate-600">{supportCase.priority}</td>
            <td className="px-5 py-4">
              <select aria-label={`Update status for case ${supportCase.id}`} value={supportCase.status}
                disabled={isSaving} onChange={(event) => onUpdateStatus(supportCase.id, event.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                {["open", "in_progress", "resolved"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
              </select>
            </td>
            <td className="px-5 py-4 text-slate-600">{formatDate(supportCase.updatedAt)}</td>
          </tr>
        ))}
      </DataTable>

      <DataTable title="Administrative audit log" empty="No platform administration actions have been recorded."
        columns={["Time", "Administrator", "Action", "Summary", "Business"]}>
        {auditLogs.map((entry) => (
          <tr key={entry.id}>
            <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(entry.createdAt, true)}</td>
            <td className="px-5 py-4"><p className="font-medium text-slate-800">{entry.actorName}</p><p className="text-xs text-slate-500">{entry.actorEmail}</p></td>
            <td className="whitespace-nowrap px-5 py-4 text-slate-600">{entry.action}</td>
            <td className="min-w-64 px-5 py-4 text-slate-600">{entry.summary}</td>
            <td className="px-5 py-4 text-slate-600">{entry.businessName || "—"}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function DataTable({ title, empty, columns, children }) {
  const hasRows = Boolean(children?.length);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {hasRows ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{columns.map((column) => <th className="px-5 py-3 font-medium" key={column}>{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          </table>
        </div>
      ) : <p className="px-5 py-8 text-sm text-slate-500">{empty}</p>}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
      {active ? "Active" : "Suspended"}
    </span>
  );
}

function Notice({ tone, children }) {
  const classes = tone === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-blue-200 bg-blue-50 text-blue-800";
  return <div className={`rounded-xl border p-4 text-sm ${classes}`} role="alert">{children}</div>;
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(value);
}

export default PlatformAdmin;
