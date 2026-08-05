"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import type {
  SubscriptionActionResult,
  SubscriptionAddonCheckoutDraft,
  SubscriptionAddonRow,
  SubscriptionBillingCycle,
  SubscriptionCheckoutDraft,
  SubscriptionCheckoutInvoiceFailedRow,
  SubscriptionFeatureAccessRow,
  SubscriptionInvoiceActivationRow,
  SubscriptionOverview,
  SubscriptionPlanRow,
  TenantSubscriptionAddonActivationRow,
  TenantSubscriptionActivationRow,
} from "@/lib/subscription-service";
import { listSubscriptionFeatureAccessRows } from "@/lib/subscription-service";

type SubscriptionPaymentHistoryStatusFilter = "all" | "Ödendi" | "Bekliyor" | "Başarısız";

type SubscriptionPaymentProviderEventStatusFilter =
  | "all"
  | SubscriptionOverview["paymentProviderEvents"][number]["status"];

const subscriptionPaymentHistoryStatusFilters: SubscriptionPaymentHistoryStatusFilter[] = [
  "all",
  "Ödendi",
  "Bekliyor",
  "Başarısız",
];

const subscriptionPaymentHistoryStatusFilterLabels: Record<
  SubscriptionPaymentHistoryStatusFilter,
  string
> = {
  all: "Tümü",
  Başarısız: "Başarısız",
  Bekliyor: "Bekliyor",
  Ödendi: "Ödendi",
};

const subscriptionPaymentProviderEventStatusFilters: SubscriptionPaymentProviderEventStatusFilter[] =
  ["all", "processing", "processed", "failed"];

const subscriptionPaymentProviderEventStatusFilterLabels: Record<
  SubscriptionPaymentProviderEventStatusFilter,
  string
> = {
  all: "Tümü",
  failed: "Hatalı",
  processed: "İşlendi",
  processing: "İşleniyor",
};

type SubscriptionSurfaceProps = {
  activateRenewalAction?: (values: {
    billingCycle: SubscriptionBillingCycle;
    invoiceNo: string;
    paymentProviderRef?: string;
  }) => Promise<SubscriptionActionResult<{ invoice: SubscriptionInvoiceActivationRow; subscription: TenantSubscriptionActivationRow }>>;
  activateAddonCheckoutAction?: (values: {
    addonId: string;
    invoiceNo: string;
    paymentProviderRef?: string;
  }) => Promise<
    SubscriptionActionResult<{
      addon: TenantSubscriptionAddonActivationRow;
      invoice: SubscriptionInvoiceActivationRow;
    }>
  >;
  activatePlanChangeAction?: (values: {
    billingCycle: SubscriptionBillingCycle;
    invoiceNo: string;
    paymentProviderRef?: string;
    targetPlanId: string;
  }) => Promise<
    SubscriptionActionResult<{
      invoice: SubscriptionInvoiceActivationRow;
      subscription: TenantSubscriptionActivationRow;
    }>
  >;
  createAddonCheckoutAction?: (values: {
    addonId: string;
  }) => Promise<SubscriptionActionResult<{ checkout: SubscriptionAddonCheckoutDraft }>>;
  createPlanChangeCheckoutAction?: (values: {
    billingCycle: SubscriptionBillingCycle;
    targetPlanId: string;
  }) => Promise<SubscriptionActionResult<{ checkout: SubscriptionCheckoutDraft }>>;
  createRenewalCheckoutAction?: (values: {
    billingCycle: SubscriptionBillingCycle;
  }) => Promise<SubscriptionActionResult<{ checkout: SubscriptionCheckoutDraft }>>;
  failAddonCheckoutAction?: (values: {
    addonId: string;
    amount: number;
    invoiceNo: string;
    paymentProviderRef?: string;
    reason?: string;
  }) => Promise<SubscriptionActionResult<{ invoice: SubscriptionCheckoutInvoiceFailedRow }>>;
  failPlanChangeCheckoutAction?: (values: {
    amount: number;
    invoiceNo: string;
    paymentProviderRef?: string;
    reason?: string;
    targetPlanId: string;
  }) => Promise<SubscriptionActionResult<{ invoice: SubscriptionCheckoutInvoiceFailedRow }>>;
  failRenewalCheckoutAction?: (values: {
    amount: number;
    invoiceNo: string;
    paymentProviderRef?: string;
    reason?: string;
  }) => Promise<SubscriptionActionResult<{ invoice: SubscriptionCheckoutInvoiceFailedRow }>>;
  overview: SubscriptionOverview;
  today?: string;
};

export function SubscriptionSurface({
  activateAddonCheckoutAction,
  activatePlanChangeAction,
  activateRenewalAction,
  createAddonCheckoutAction,
  createPlanChangeCheckoutAction,
  createRenewalCheckoutAction,
  failAddonCheckoutAction,
  failPlanChangeCheckoutAction,
  failRenewalCheckoutAction,
  overview,
  today = new Date().toISOString().slice(0, 10),
}: SubscriptionSurfaceProps) {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>(
    overview.currentSubscription.billingCycle,
  );
  const [pendingPlanId, setPendingPlanId] = useState<string>();
  const [pendingAddonId, setPendingAddonId] = useState<string>();
  const [renewalPending, setRenewalPending] = useState(false);
  const [checkoutDraft, setCheckoutDraft] = useState<SubscriptionCheckoutDraft>();
  const [checkoutKind, setCheckoutKind] = useState<"plan-change" | "renewal">("plan-change");
  const [addonCheckoutDraft, setAddonCheckoutDraft] =
    useState<SubscriptionAddonCheckoutDraft>();
  const [paymentHistoryStatusFilter, setPaymentHistoryStatusFilter] =
    useState<SubscriptionPaymentHistoryStatusFilter>("all");
  const [paymentProviderEventStatusFilter, setPaymentProviderEventStatusFilter] =
    useState<SubscriptionPaymentProviderEventStatusFilter>("all");
  const [notice, setNotice] = useState(
    "Paket değişikliği ödeme sağlayıcı açılmadan fatura taslağı olarak hazırlanır.",
  );
  const filteredPaymentHistory = overview.paymentHistory.filter(
    (payment) =>
      paymentHistoryStatusFilter === "all" ||
      payment.status === paymentHistoryStatusFilter,
  );
  const filteredPaymentProviderEvents = overview.paymentProviderEvents.filter(
    (event) =>
      paymentProviderEventStatusFilter === "all" ||
      event.status === paymentProviderEventStatusFilter,
  );
  const featureAccessRows = listSubscriptionFeatureAccessRows(overview);

  async function handlePlanChangeCheckout(plan: SubscriptionPlanRow) {
    if (!createPlanChangeCheckoutAction || plan.isCurrent) {
      return;
    }

    setPendingPlanId(plan.id);
    setNotice(`${plan.name} için satın alma taslağı hazırlanıyor...`);

    const result = await createPlanChangeCheckoutAction({
      billingCycle,
      targetPlanId: plan.id,
    });

    if (result.ok) {
      setCheckoutKind("plan-change");
      setCheckoutDraft(result.data.checkout);
      router.refresh();
      setNotice(
        `${result.data.checkout.targetPlanName} için satın alma taslağı hazır: ${result.data.checkout.invoiceDraft.invoiceNo}`,
      );
    } else {
      setNotice(result.errors.join(" "));
    }

    setPendingPlanId(undefined);
  }

  async function handleRenewalCheckout() {
    if (!createRenewalCheckoutAction) return;
    setRenewalPending(true);
    setNotice(`${overview.currentSubscription.planName} yenileme taslağı hazırlanıyor...`);
    const result = await createRenewalCheckoutAction({ billingCycle });
    if (result.ok) {
      setCheckoutKind("renewal");
      setCheckoutDraft(result.data.checkout);
      router.refresh();
      setNotice(`Manuel yenileme taslağı hazır: ${result.data.checkout.invoiceDraft.invoiceNo}`);
    } else {
      setNotice(result.errors.join(" "));
    }
    setRenewalPending(false);
  }

  async function handleAddonCheckout(addon: SubscriptionAddonRow) {
    if (!createAddonCheckoutAction || addon.status === "included") {
      return;
    }

    setPendingAddonId(addon.id);
    setNotice(`${addon.name} için ek özellik satın alma taslağı hazırlanıyor...`);

    const result = await createAddonCheckoutAction({
      addonId: addon.id,
    });

    if (result.ok) {
      setAddonCheckoutDraft(result.data.checkout);
      router.refresh();
      setNotice(
        `${result.data.checkout.addonName} için ek özellik satın alma taslağı hazır: ${result.data.checkout.invoiceDraft.invoiceNo}`,
      );
    } else {
      setNotice(result.errors.join(" "));
    }

    setPendingAddonId(undefined);
  }

  async function handleAddonSandboxActivation() {
    if (!activateAddonCheckoutAction || !addonCheckoutDraft) {
      return;
    }

    setNotice(`${addonCheckoutDraft.addonName} sandbox ek özellik onayı işleniyor...`);
    const result = await activateAddonCheckoutAction({
      addonId: addonCheckoutDraft.addonId,
      invoiceNo: addonCheckoutDraft.invoiceDraft.invoiceNo,
      paymentProviderRef: getAddonCheckoutPaymentProviderRef(
        addonCheckoutDraft,
        "sandbox-addon-ui-confirmation",
      ),
    });

    if (result.ok) {
      setAddonCheckoutDraft(undefined);
      router.refresh();
      setNotice(
        `${addonCheckoutDraft.addonName} ek özelliği sandbox ödeme onayıyla aktive edildi. Başlangıç: ${result.data.addon.startsAt}`,
      );
    } else {
      setNotice(result.errors.join(" "));
    }
  }

  async function handleAddonSandboxFailure() {
    if (!failAddonCheckoutAction || !addonCheckoutDraft) {
      return;
    }

    setNotice(`${addonCheckoutDraft.addonName} sandbox ek özellik ödeme hatası işleniyor...`);
    const result = await failAddonCheckoutAction({
      addonId: addonCheckoutDraft.addonId,
      amount: addonCheckoutDraft.amount,
      invoiceNo: addonCheckoutDraft.invoiceDraft.invoiceNo,
      paymentProviderRef: getAddonCheckoutPaymentProviderRef(
        addonCheckoutDraft,
        "sandbox-addon-ui-failure",
      ),
      reason: "Sandbox ek özellik ödeme sağlayıcı hata simülasyonu",
    });

    if (result.ok) {
      setAddonCheckoutDraft(undefined);
      router.refresh();
      setNotice(
        `${addonCheckoutDraft.addonName} için sandbox ek özellik ödemesi başarısız kaydedildi: ${result.data.invoice.invoiceNo}`,
      );
    } else {
      setNotice(result.errors.join(" "));
    }
  }

  async function handleSandboxActivation() {
    if (!checkoutDraft || (checkoutKind === "renewal" ? !activateRenewalAction : !activatePlanChangeAction)) {
      return;
    }

    setNotice(`${checkoutDraft.targetPlanName} sandbox ödeme onayı işleniyor...`);
    const commonValues = {
      billingCycle: checkoutDraft.billingCycle,
      invoiceNo: checkoutDraft.invoiceDraft.invoiceNo,
      paymentProviderRef: getCheckoutPaymentProviderRef(checkoutDraft, "sandbox-ui-confirmation"),
    };
    const result = checkoutKind === "renewal"
      ? await activateRenewalAction!(commonValues)
      : await activatePlanChangeAction!({ ...commonValues, targetPlanId: checkoutDraft.targetPlanId });

    if (result.ok) {
      setCheckoutDraft(undefined);
      router.refresh();
      setNotice(
        checkoutKind === "renewal"
          ? `${checkoutDraft.targetPlanName} paketi yenilendi. Yeni bitiş: ${result.data.subscription.endsAt}`
          : `${checkoutDraft.targetPlanName} paketi sandbox ödeme onayıyla aktive edildi. Bitiş: ${result.data.subscription.endsAt}`,
      );
    } else {
      setNotice(result.errors.join(" "));
    }
  }

  async function handleSandboxFailure() {
    if (!checkoutDraft || (checkoutKind === "renewal" ? !failRenewalCheckoutAction : !failPlanChangeCheckoutAction)) {
      return;
    }

    setNotice(`${checkoutDraft.targetPlanName} sandbox ödeme hatası işleniyor...`);
    const commonValues = {
      amount: checkoutDraft.amount,
      invoiceNo: checkoutDraft.invoiceDraft.invoiceNo,
      paymentProviderRef: getCheckoutPaymentProviderRef(
        checkoutDraft,
        "sandbox-ui-failure",
      ),
      reason: "Sandbox ödeme sağlayıcı hata simülasyonu",
    };
    const result = checkoutKind === "renewal"
      ? await failRenewalCheckoutAction!(commonValues)
      : await failPlanChangeCheckoutAction!({ ...commonValues, targetPlanId: checkoutDraft.targetPlanId });

    if (result.ok) {
      setCheckoutDraft(undefined);
      router.refresh();
      setNotice(
        `${checkoutDraft.targetPlanName} için sandbox ödeme başarısız kaydedildi: ${result.data.invoice.invoiceNo}`,
      );
    } else {
      setNotice(result.errors.join(" "));
    }
  }

  return (
    <section
      className="mx-auto flex max-w-[1440px] flex-col gap-4"
      data-subscription-workspace="true"
    >
      <header className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
          Yönetim · Paket ve faturalama
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
              Abonelik ve Paketler
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
              Mevcut paket özeti, yenileme sepeti, paket yükseltme, ek
              özellikler ve ödeme geçmişi aynı SaaS iş akışı içinde izlenir.
            </p>
          </div>
          <div className="rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning">
            Sandbox ödeme akışı · gerçek tahsilat yok
          </div>
        </div>
        </div>
      </header>

      <div
        className="flex flex-col gap-2 rounded-ui-panel border border-divider bg-surface-raised px-4 py-3 text-sm text-content-muted shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <span role="status">{notice}</span>
        {checkoutDraft?.providerSession ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="h-8 rounded-ui-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-on-brand transition hover:bg-brand-primary-strong"
              href={checkoutDraft.providerSession.redirectUrl}
            >
              Ödeme Sağlayıcıya Git
            </a>
            <span className="text-xs font-semibold text-content-subtle">
              Geçerli: {formatDateTime(checkoutDraft.providerSession.expiresAt)}
            </span>
          </div>
        ) : null}
        {addonCheckoutDraft?.providerSession ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="h-8 rounded-ui-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-on-brand transition hover:bg-brand-primary-strong"
              href={addonCheckoutDraft.providerSession.redirectUrl}
            >
              Ek Özellik Ödeme Sağlayıcıya Git
            </a>
            <span className="text-xs font-semibold text-content-subtle">
              Geçerli: {formatDateTime(addonCheckoutDraft.providerSession.expiresAt)}
            </span>
          </div>
        ) : null}
        {checkoutDraft && (activatePlanChangeAction || activateRenewalAction || failPlanChangeCheckoutAction || failRenewalCheckoutAction) ? (
          <div className="flex flex-wrap gap-2">
            {(checkoutKind === "renewal" ? activateRenewalAction : activatePlanChangeAction) ? (
              <button
                className="h-8 rounded-ui-control bg-brand-primary px-3 text-xs font-semibold text-on-brand transition hover:bg-brand-primary-strong"
                onClick={handleSandboxActivation}
                type="button"
              >
                Sandbox Ödeme Onayla
              </button>
            ) : null}
            {(checkoutKind === "renewal" ? failRenewalCheckoutAction : failPlanChangeCheckoutAction) ? (
              <button
                className="h-8 rounded-ui-control border border-[var(--ds-danger)] px-3 text-xs font-semibold text-[var(--ds-danger)] transition hover:bg-surface-raised"
                onClick={handleSandboxFailure}
                type="button"
              >
                Sandbox Ödeme Hatası
              </button>
            ) : null}
          </div>
        ) : null}
        {addonCheckoutDraft && (activateAddonCheckoutAction || failAddonCheckoutAction) ? (
          <div className="flex flex-wrap gap-2">
            {activateAddonCheckoutAction ? (
              <button
                className="h-8 rounded-ui-control bg-brand-primary px-3 text-xs font-semibold text-on-brand transition hover:bg-brand-primary-strong"
                onClick={handleAddonSandboxActivation}
                type="button"
              >
                Sandbox Ek Özellik Onayla
              </button>
            ) : null}
            {failAddonCheckoutAction ? (
              <button
                className="h-8 rounded-ui-control border border-[var(--ds-danger)] px-3 text-xs font-semibold text-[var(--ds-danger)] transition hover:bg-surface-raised"
                onClick={handleAddonSandboxFailure}
                type="button"
              >
                Sandbox Ek Özellik Hatası
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <CurrentSubscriptionPanel
          isExpired={overview.currentSubscription.endsAt < today}
          overview={overview}
          today={today}
        />
        <RenewalBasket
          billingCycle={billingCycle}
          createRenewalCheckoutAction={createRenewalCheckoutAction}
          onBillingCycleChange={setBillingCycle}
          onCreateRenewal={handleRenewalCheckout}
          renewalPending={renewalPending}
          overview={overview}
        />
      </section>

      <section
        aria-label="Paketleri Yükselt"
        className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-content">Paketleri Karşılaştır</h2>
            <p className="mt-1 text-xs text-content-muted">Dönem fiyatını seçin ve mevcut paket kapsamını karşılaştırın.</p>
          </div>
          <BillingCycleControl
            billingCycle={billingCycle}
            onBillingCycleChange={setBillingCycle}
          />
        </div>
        <div className="grid gap-3 p-4 xl:grid-cols-4">
          {overview.plans.map((plan) => (
            <PlanPanel
              billingCycle={billingCycle}
              isPending={pendingPlanId === plan.id}
              key={plan.id}
              onCreateCheckout={handlePlanChangeCheckout}
              plan={plan}
            />
          ))}
        </div>
      </section>

      <AccessMatrixPanel rows={featureAccessRows} />

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <AddonsPanel
          onCreateAddonCheckout={handleAddonCheckout}
          overview={overview}
          pendingAddonId={pendingAddonId}
        />
        <PaymentHistoryPanel
          filteredRows={filteredPaymentHistory}
          onStatusFilterChange={setPaymentHistoryStatusFilter}
          overview={overview}
          statusFilter={paymentHistoryStatusFilter}
        />
      </section>

      <PaymentProviderEventsPanel
        filteredRows={filteredPaymentProviderEvents}
        onStatusFilterChange={setPaymentProviderEventStatusFilter}
        overview={overview}
        statusFilter={paymentProviderEventStatusFilter}
      />
    </section>
  );
}

function AccessMatrixPanel({ rows }: { rows: SubscriptionFeatureAccessRow[] }) {
  return (
    <section className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Abonelik Erişim Matrisi</h2>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="Abonelik erişim matrisi"
          className="min-w-full divide-y divide-divider text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-3 py-2 text-left">Özellik</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-left">Kaynak</th>
              <th className="px-3 py-2 text-left">Gereken Paket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-3 py-2 font-semibold">{row.label}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-ui-control px-2 py-1 text-xs font-semibold ${
                      row.enabled
                        ? "bg-[var(--ds-success)] text-on-status"
                        : "bg-[var(--ds-text-muted)] text-on-status"
                    }`}
                  >
                    {row.enabled ? "Aktif" : "Yükseltme Gerekli"}
                  </span>
                </td>
                <td className="px-3 py-2 text-content-subtle">
                  {formatAccessSource(row.source)}
                </td>
                <td className="px-3 py-2">{row.requiredPlan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CurrentSubscriptionPanel({
  isExpired,
  overview,
  today = new Date().toISOString().slice(0, 10),
}: SubscriptionSurfaceProps & { isExpired: boolean }) {
  const subscription = overview.currentSubscription;
  const renewalTimeline = getSubscriptionRenewalTimeline(subscription.endsAt, today);

  return (
    <article className="overflow-hidden rounded-ui-panel border border-brand-primary/20 bg-surface-raised p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-primary">
        Mevcut paket
      </p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-content">{subscription.planName}</h2>
          <p className="mt-1 text-sm text-content-subtle">
            {formatDate(subscription.startsAt)} - {formatDate(subscription.endsAt)}
          </p>
          {isExpired ? (
            <p className="mt-2 text-sm font-medium text-[var(--ds-danger)]">
              Abonelik süresi {subscription.endsAt} tarihinde doldu. Paketi
              yenilemek gerekir.
            </p>
          ) : !subscription.autoRenew ? (
            <p className="mt-2 text-sm font-medium text-content-subtle">
              Otomatik tahsilat planlanmadı; yenileme manuel başlatılmalıdır.
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-ui-control px-2 py-1 text-xs font-semibold text-on-status ${
            subscription.autoRenew
              ? "bg-[var(--ds-success)]"
              : "bg-[var(--ds-text-muted)]"
          }`}
        >
          {subscription.autoRenew
            ? "Otomatik yenileme açık"
            : "Otomatik yenileme kapalı"}
        </span>
        {isExpired ? (
          <span className="rounded-ui-control bg-[var(--ds-danger)] px-2 py-1 text-xs font-semibold text-on-status">
            Süresi doldu
          </span>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <SummaryRow label="Kullanıcı limiti" value={`${subscription.userLimit}`} />
        <SummaryRow
          label="Depolama"
          value={`${subscription.storageLimitGb} GB`}
        />
        <SummaryRow
          label="Yenileme tutarı"
          value={`${formatMoney(subscription.renewalAmount)} / ${
            subscription.billingCycle === "yearly" ? "yıl" : "ay"
          }`}
        />
        {!isExpired ? (
          <SummaryRow label="Yenileme takvimi" value={renewalTimeline} />
        ) : null}
      </dl>
    </article>
  );
}

function RenewalBasket({
  billingCycle,
  createRenewalCheckoutAction,
  onBillingCycleChange,
  overview,
  onCreateRenewal,
  renewalPending,
}: SubscriptionSurfaceProps & {
  billingCycle: SubscriptionBillingCycle;
  onBillingCycleChange: (cycle: SubscriptionBillingCycle) => void;
  onCreateRenewal: () => void;
  renewalPending: boolean;
}) {
  const currentPlan = overview.plans.find((plan) => plan.isCurrent);
  const amount = currentPlan ? getPlanPrice(currentPlan, billingCycle) : 0;

  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-bold text-content">Yenileme Özeti</h2>
          <p className="mt-1 text-sm text-content-subtle">
            Aktif paket, dönem seçimi ve yenileme tutarı tek sepet görünümünde
            izlenir.
          </p>
        </div>
        <BillingCycleControl
          billingCycle={billingCycle}
          onBillingCycleChange={onBillingCycleChange}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Aktif Paket" value={overview.currentSubscription.planName} />
        <Metric
          label="Dönem"
          value={billingCycle === "yearly" ? "Yıllık" : "Aylık"}
        />
        <Metric
          label="Sepet Tutarı"
          value={`${formatMoney(amount)} / ${
            billingCycle === "yearly" ? "yıl" : "ay"
          }`}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button
          className="h-9 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
          disabled={renewalPending || !createRenewalCheckoutAction}
          onClick={onCreateRenewal}
          type="button"
        >
          {renewalPending ? "Yenileme hazırlanıyor..." : "Manuel Yenilemeyi Başlat"}
        </button>
      </div>
    </article>
  );
}

function PlanPanel({
  billingCycle,
  isPending,
  onCreateCheckout,
  plan,
}: {
  billingCycle: SubscriptionBillingCycle;
  isPending: boolean;
  onCreateCheckout: (plan: SubscriptionPlanRow) => void;
  plan: SubscriptionPlanRow;
}) {
  return (
    <article className={`flex min-h-72 flex-col rounded-ui-panel border p-4 transition ${plan.isCurrent ? "border-brand-primary bg-brand-primary-subtle/40 shadow-sm" : "border-divider bg-surface-muted hover:border-brand-primary/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-content">{plan.name}</h3>
          <p className="mt-1 text-sm leading-5 text-content-subtle">
            {plan.description}
          </p>
        </div>
        {plan.isCurrent ? (
          <span className="rounded-ui-control bg-brand-primary px-2 py-1 text-xs font-semibold text-on-brand">
            Mevcut
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-mono text-xl font-semibold">
        {formatMoney(getPlanPrice(plan, billingCycle))} /{" "}
        {billingCycle === "yearly" ? "yıl" : "ay"}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {plan.includedModules.map((moduleName) => (
          <li className="flex gap-2" key={moduleName}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ds-success)]" />
            <span>{moduleName}</span>
          </li>
        ))}
      </ul>
      <button
        className="mt-4 h-9 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold transition hover:bg-brand-primary-subtle"
        disabled={plan.isCurrent || isPending}
        onClick={() => onCreateCheckout(plan)}
        type="button"
      >
        {plan.isCurrent ? "Mevcut Paket" : isPending ? "Hazırlanıyor" : "Yükselt"}
      </button>
    </article>
  );
}

function AddonsPanel({
  onCreateAddonCheckout,
  overview,
  pendingAddonId,
}: SubscriptionSurfaceProps & {
  onCreateAddonCheckout?: (addon: SubscriptionAddonRow) => void;
  pendingAddonId?: string;
}) {
  return (
    <section
      aria-label="Ek Özellikler"
      className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm"
    >
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Ek Özellikler</h2>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {overview.addons.map((addon) => (
          <article
            className="rounded-ui-panel border border-divider bg-surface-muted p-3"
            key={addon.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{addon.name}</h3>
                <p className="mt-1 text-sm text-content-subtle">
                  {addon.description}
                </p>
              </div>
              <span className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold text-content-subtle">
                {formatAddonStatus(addon.status)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold">
                {formatMoney(addon.monthlyPrice)} / ay
              </span>
              <button
                className="h-8 rounded-ui-control bg-brand-primary px-3 text-xs font-semibold text-on-brand transition hover:bg-brand-primary-strong"
                disabled={
                  addon.status === "included" ||
                  addon.status === "active" ||
                  pendingAddonId === addon.id
                }
                onClick={() => onCreateAddonCheckout?.(addon)}
                type="button"
              >
                {addon.status === "included"
                  ? "Dahil"
                  : addon.status === "active"
                    ? "Aktif"
                    : pendingAddonId === addon.id
                      ? "Hazırlanıyor"
                      : "Satın Al"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getSubscriptionRenewalTimeline(endsAt: string, today: string) {
  const remainingDays = Math.round(
    (toUtcDate(endsAt).getTime() - toUtcDate(today).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (remainingDays === 0) {
    return "Yenileme bugün gerekli";
  }

  return `Yenilemeye ${remainingDays} gün kaldı`;
}

function toUtcDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatAddonStatus(status: SubscriptionAddonRow["status"]) {
  if (status === "included") {
    return "dahil";
  }

  if (status === "active") {
    return "aktif";
  }

  return "ek";
}

function PaymentHistoryPanel({
  filteredRows,
  onStatusFilterChange,
  overview,
  statusFilter,
}: SubscriptionSurfaceProps & {
  filteredRows: SubscriptionOverview["paymentHistory"];
  onStatusFilterChange: Dispatch<SetStateAction<SubscriptionPaymentHistoryStatusFilter>>;
  statusFilter: SubscriptionPaymentHistoryStatusFilter;
}) {
  return (
    <section className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Ödeme Geçmişi</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Durum filtresi
        </span>
        {subscriptionPaymentHistoryStatusFilters.map((filter) => (
          <button
            aria-pressed={statusFilter === filter}
            className={`h-8 rounded-ui-control border px-3 text-xs font-semibold transition ${
              statusFilter === filter
                ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                : "border-divider bg-surface-muted text-content-subtle hover:bg-brand-primary-subtle"
            }`}
            key={filter}
            onClick={() =>
              onStatusFilterChange((currentFilter) =>
                currentFilter === filter ? "all" : filter,
              )
            }
            type="button"
          >
            {subscriptionPaymentHistoryStatusFilterLabels[filter]}
          </button>
        ))}
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs font-semibold text-content-subtle">
          {overview.paymentHistory.length} kayıt içinden {filteredRows.length} gösteriliyor.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="Ödeme geçmişi"
          className="min-w-full divide-y divide-divider text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-3 py-2 text-left">Fatura</th>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-right">Tutar</th>
              <th className="px-3 py-2 text-left">Yöntem</th>
              <th className="px-3 py-2 text-left">Sağlayıcı Ref</th>
              <th className="px-3 py-2 text-left">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredRows.length > 0 ? (
              filteredRows.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {payment.invoiceNo}
                  </td>
                  <td className="px-3 py-2">{formatDate(payment.date)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-3 py-2">{payment.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {payment.providerRef ?? "-"}
                  </td>
                  <td className="px-3 py-2">{payment.status}</td>
                </tr>
              ))
            ) : overview.paymentHistory.length > 0 ? (
              <tr>
                <td
                  className="px-3 py-4 text-center text-content-subtle"
                  colSpan={6}
                >
                  Seçili filtreye uyan ödeme geçmişi yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  className="px-3 py-4 text-center text-content-subtle"
                  colSpan={6}
                >
                  Kayıtlı ödeme geçmişi yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaymentProviderEventsPanel({
  filteredRows,
  onStatusFilterChange,
  overview,
  statusFilter,
}: SubscriptionSurfaceProps & {
  filteredRows: SubscriptionOverview["paymentProviderEvents"];
  onStatusFilterChange: Dispatch<
    SetStateAction<SubscriptionPaymentProviderEventStatusFilter>
  >;
  statusFilter: SubscriptionPaymentProviderEventStatusFilter;
}) {
  const processingCount = overview.paymentProviderEvents.filter(
    (event) => event.status === "processing",
  ).length;
  const failedCount = overview.paymentProviderEvents.filter(
    (event) => event.status === "failed",
  ).length;

  return (
    <section className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Ödeme Sağlayıcı Olayları</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Durum filtresi
        </span>
        {subscriptionPaymentProviderEventStatusFilters.map((filter) => (
          <button
            aria-pressed={statusFilter === filter}
            className={`h-8 rounded-ui-control border px-3 text-xs font-semibold transition ${
              statusFilter === filter
                ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                : "border-divider bg-surface-muted text-content-subtle hover:bg-brand-primary-subtle"
            }`}
            key={filter}
            onClick={() =>
              onStatusFilterChange((currentFilter) =>
                currentFilter === filter ? "all" : filter,
              )
            }
            type="button"
          >
            {subscriptionPaymentProviderEventStatusFilterLabels[filter]}
          </button>
        ))}
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs font-semibold text-content-subtle">
          {overview.paymentProviderEvents.length} kayıt içinden {filteredRows.length} gösteriliyor.
        </p>
        <p className="mt-1 text-xs text-content-subtle">
          İşleniyor: {processingCount} · Hatalı: {failedCount}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="Ödeme sağlayıcı olayları"
          className="min-w-full divide-y divide-divider text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-left">Tip</th>
              <th className="px-3 py-2 text-left">Fatura</th>
              <th className="px-3 py-2 text-left">Sağlayıcı Ref</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-left">Neden</th>
              <th className="px-3 py-2 text-left">Alınma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredRows.length > 0 ? (
              filteredRows.map((event) => (
                <tr key={event.eventId}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {event.eventId}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {event.eventType}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {event.invoiceNo}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {event.providerRef}
                  </td>
                  <td className="px-3 py-2">
                    {formatProviderEventStatus(event.status, event.resultStatus)}
                  </td>
                  <td className="px-3 py-2 text-content-subtle">
                    {event.errorMessage ?? "-"}
                  </td>
                  <td className="px-3 py-2">{formatDateTime(event.receivedAt)}</td>
                </tr>
              ))
            ) : overview.paymentProviderEvents.length > 0 ? (
              <tr>
                <td
                  className="px-3 py-4 text-center text-content-subtle"
                  colSpan={7}
                >
                  Seçili filtreye uyan ödeme sağlayıcı olayı yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  className="px-3 py-4 text-center text-content-subtle"
                  colSpan={7}
                >
                  Kayıtlı ödeme sağlayıcı olayı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BillingCycleControl({
  billingCycle,
  onBillingCycleChange,
}: {
  billingCycle: SubscriptionBillingCycle;
  onBillingCycleChange: (cycle: SubscriptionBillingCycle) => void;
}) {
  return (
    <div
      aria-label="Abonelik dönem seçimi"
      className="flex w-fit rounded-ui-control border border-divider bg-surface-muted p-1"
    >
      <button
        className={cycleButtonClass(billingCycle === "monthly")}
        onClick={() => onBillingCycleChange("monthly")}
        type="button"
      >
        Aylık
      </button>
      <button
        className={cycleButtonClass(billingCycle === "yearly")}
        onClick={() => onBillingCycleChange("yearly")}
        type="button"
      >
        Yıllık %17 indirim
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-divider pt-2 first:border-t-0 first:pt-0">
      <dt className="text-content-subtle">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ui-control border border-divider bg-surface-muted p-3">
      <p className="text-xs text-content-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function getPlanPrice(
  plan: SubscriptionPlanRow,
  billingCycle: SubscriptionBillingCycle,
) {
  return billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value) + " TL";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeZone: "Europe/Istanbul",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatProviderEventStatus(
  status: SubscriptionOverview["paymentProviderEvents"][number]["status"],
  resultStatus: SubscriptionOverview["paymentProviderEvents"][number]["resultStatus"],
) {
  if (status === "processed" && resultStatus === "activated") {
    return "İşlendi / Aktive";
  }

  if (status === "processed" && resultStatus === "failed") {
    return "İşlendi / Başarısız";
  }

  if (status === "failed") {
    return "Hatalı";
  }

  if (status === "processing") {
    return "İşleniyor";
  }

  if (status === "processed") {
    return "İşlendi";
  }

  return status;
}

function getCheckoutPaymentProviderRef(
  checkoutDraft: SubscriptionCheckoutDraft,
  fallback: string,
) {
  return checkoutDraft.providerSession?.providerRef ?? fallback;
}

function getAddonCheckoutPaymentProviderRef(
  checkoutDraft: SubscriptionAddonCheckoutDraft,
  fallback: string,
) {
  return checkoutDraft.providerSession?.providerRef ?? fallback;
}

function cycleButtonClass(active: boolean) {
  return `h-8 rounded-ui-control px-3 text-xs font-semibold transition ${
    active
      ? "bg-brand-primary text-on-brand"
      : "text-content-subtle hover:bg-brand-primary-subtle"
  }`;
}

function formatAccessSource(source: SubscriptionFeatureAccessRow["source"]) {
  if (source === "addon-included") {
    return "Dahil ek özellik";
  }

  if (source === "plan") {
    return "Paket kapsamı";
  }

  return "Yükseltme";
}
