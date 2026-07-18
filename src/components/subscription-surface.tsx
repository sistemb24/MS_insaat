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
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          P2 paket ve faturalama
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Abonelik ve Paket Yönetimi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              Mevcut paket özeti, yenileme sepeti, paket yükseltme, ek
              özellikler ve ödeme geçmişi aynı SaaS iş akışı içinde izlenir.
            </p>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            Sandbox ödeme sağlayıcı session hazır
          </div>
        </div>
      </header>

      <div
        className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm text-[var(--on-surface-variant)] md:flex-row md:items-center md:justify-between"
      >
        <span role="status">{notice}</span>
        {checkoutDraft?.providerSession ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="h-8 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
              href={checkoutDraft.providerSession.redirectUrl}
            >
              Ödeme Sağlayıcıya Git
            </a>
            <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
              Geçerli: {formatDateTime(checkoutDraft.providerSession.expiresAt)}
            </span>
          </div>
        ) : null}
        {addonCheckoutDraft?.providerSession ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="h-8 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
              href={addonCheckoutDraft.providerSession.redirectUrl}
            >
              Ek Özellik Ödeme Sağlayıcıya Git
            </a>
            <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
              Geçerli: {formatDateTime(addonCheckoutDraft.providerSession.expiresAt)}
            </span>
          </div>
        ) : null}
        {checkoutDraft && (activatePlanChangeAction || activateRenewalAction || failPlanChangeCheckoutAction || failRenewalCheckoutAction) ? (
          <div className="flex flex-wrap gap-2">
            {(checkoutKind === "renewal" ? activateRenewalAction : activatePlanChangeAction) ? (
              <button
                className="h-8 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                onClick={handleSandboxActivation}
                type="button"
              >
                Sandbox Ödeme Onayla
              </button>
            ) : null}
            {(checkoutKind === "renewal" ? failRenewalCheckoutAction : failPlanChangeCheckoutAction) ? (
              <button
                className="h-8 rounded-[var(--radius-control)] border border-[var(--status-cancelled)] px-3 text-xs font-semibold text-[var(--status-cancelled)] transition hover:bg-[var(--surface-container-lowest)]"
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
                className="h-8 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                onClick={handleAddonSandboxActivation}
                type="button"
              >
                Sandbox Ek Özellik Onayla
              </button>
            ) : null}
            {failAddonCheckoutAction ? (
              <button
                className="h-8 rounded-[var(--radius-control)] border border-[var(--status-cancelled)] px-3 text-xs font-semibold text-[var(--status-cancelled)] transition hover:bg-[var(--surface-container-lowest)]"
                onClick={handleAddonSandboxFailure}
                type="button"
              >
                Sandbox Ek Özellik Hatası
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
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
        className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]"
      >
        <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold">Paketleri Yükselt</h2>
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

      <AccessMatrixPanel rows={listSubscriptionFeatureAccessRows(overview)} />

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
    <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="border-b border-[var(--grid-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">Abonelik Erişim Matrisi</h2>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="Abonelik erişim matrisi"
          className="min-w-full divide-y divide-[var(--grid-border)] text-sm"
        >
          <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
            <tr>
              <th className="px-3 py-2 text-left">Özellik</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-left">Kaynak</th>
              <th className="px-3 py-2 text-left">Gereken Paket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--grid-border)]">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-3 py-2 font-semibold">{row.label}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold ${
                      row.enabled
                        ? "bg-[var(--status-approved)] text-white"
                        : "bg-[var(--status-draft)] text-white"
                    }`}
                  >
                    {row.enabled ? "Aktif" : "Yükseltme Gerekli"}
                  </span>
                </td>
                <td className="px-3 py-2 text-[var(--on-surface-variant)]">
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
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
        Mevcut paket
      </p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{subscription.planName}</h2>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
            {formatDate(subscription.startsAt)} - {formatDate(subscription.endsAt)}
          </p>
          {isExpired ? (
            <p className="mt-2 text-sm font-medium text-[var(--status-cancelled)]">
              Abonelik süresi {subscription.endsAt} tarihinde doldu. Paketi
              yenilemek gerekir.
            </p>
          ) : !subscription.autoRenew ? (
            <p className="mt-2 text-sm font-medium text-[var(--on-surface-variant)]">
              Otomatik tahsilat planlanmadı; yenileme manuel başlatılmalıdır.
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold text-white ${
            subscription.autoRenew
              ? "bg-[var(--status-approved)]"
              : "bg-[var(--status-draft)]"
          }`}
        >
          {subscription.autoRenew
            ? "Otomatik yenileme açık"
            : "Otomatik yenileme kapalı"}
        </span>
        {isExpired ? (
          <span className="rounded-[var(--radius-control)] bg-[var(--status-cancelled)] px-2 py-1 text-xs font-semibold text-white">
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
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Birleşik Yenileme Sepeti</h2>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
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
          className="h-9 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
    <article className="flex min-h-72 flex-col rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{plan.name}</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--on-surface-variant)]">
            {plan.description}
          </p>
        </div>
        {plan.isCurrent ? (
          <span className="rounded-[var(--radius-control)] bg-[var(--primary)] px-2 py-1 text-xs font-semibold text-white">
            aktif
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
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--status-approved)]" />
            <span>{moduleName}</span>
          </li>
        ))}
      </ul>
      <button
        className="mt-4 h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm font-semibold transition hover:bg-[var(--primary-fixed)]"
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
      className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]"
    >
      <div className="border-b border-[var(--grid-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">Ek Özellikler</h2>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {overview.addons.map((addon) => (
          <article
            className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-3"
            key={addon.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{addon.name}</h3>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                  {addon.description}
                </p>
              </div>
              <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                {formatAddonStatus(addon.status)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold">
                {formatMoney(addon.monthlyPrice)} / ay
              </span>
              <button
                className="h-8 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
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
    <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="border-b border-[var(--grid-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">Ödeme Geçmişi</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
          Durum filtresi
        </span>
        {subscriptionPaymentHistoryStatusFilters.map((filter) => (
          <button
            aria-pressed={statusFilter === filter}
            className={`h-8 rounded-[var(--radius-control)] border px-3 text-xs font-semibold transition ${
              statusFilter === filter
                ? "border-[var(--primary)] bg-[var(--primary-fixed)] text-[var(--primary)]"
                : "border-[var(--grid-border)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--primary-fixed)]"
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
        <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
          {overview.paymentHistory.length} kayıt içinden {filteredRows.length} gösteriliyor.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="Ödeme geçmişi"
          className="min-w-full divide-y divide-[var(--grid-border)] text-sm"
        >
          <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
            <tr>
              <th className="px-3 py-2 text-left">Fatura</th>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-right">Tutar</th>
              <th className="px-3 py-2 text-left">Yöntem</th>
              <th className="px-3 py-2 text-left">Sağlayıcı Ref</th>
              <th className="px-3 py-2 text-left">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--grid-border)]">
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
                  className="px-3 py-4 text-center text-[var(--on-surface-variant)]"
                  colSpan={6}
                >
                  Seçili filtreye uyan ödeme geçmişi yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  className="px-3 py-4 text-center text-[var(--on-surface-variant)]"
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
    <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="border-b border-[var(--grid-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">Ödeme Sağlayıcı Olayları</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
          Durum filtresi
        </span>
        {subscriptionPaymentProviderEventStatusFilters.map((filter) => (
          <button
            aria-pressed={statusFilter === filter}
            className={`h-8 rounded-[var(--radius-control)] border px-3 text-xs font-semibold transition ${
              statusFilter === filter
                ? "border-[var(--primary)] bg-[var(--primary-fixed)] text-[var(--primary)]"
                : "border-[var(--grid-border)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--primary-fixed)]"
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
        <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
          {overview.paymentProviderEvents.length} kayıt içinden {filteredRows.length} gösteriliyor.
        </p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          İşleniyor: {processingCount} · Hatalı: {failedCount}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="Ödeme sağlayıcı olayları"
          className="min-w-full divide-y divide-[var(--grid-border)] text-sm"
        >
          <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
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
          <tbody className="divide-y divide-[var(--grid-border)]">
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
                  <td className="px-3 py-2 text-[var(--on-surface-variant)]">
                    {event.errorMessage ?? "-"}
                  </td>
                  <td className="px-3 py-2">{formatDateTime(event.receivedAt)}</td>
                </tr>
              ))
            ) : overview.paymentProviderEvents.length > 0 ? (
              <tr>
                <td
                  className="px-3 py-4 text-center text-[var(--on-surface-variant)]"
                  colSpan={7}
                >
                  Seçili filtreye uyan ödeme sağlayıcı olayı yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  className="px-3 py-4 text-center text-[var(--on-surface-variant)]"
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
      className="flex w-fit rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-1"
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
    <div className="flex items-center justify-between gap-3 border-t border-[var(--grid-border)] pt-2 first:border-t-0 first:pt-0">
      <dt className="text-[var(--on-surface-variant)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-3">
      <p className="text-xs text-[var(--on-surface-variant)]">{label}</p>
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
  return `h-8 rounded-[var(--radius-control)] px-3 text-xs font-semibold transition ${
    active
      ? "bg-[var(--primary)] text-white"
      : "text-[var(--on-surface-variant)] hover:bg-[var(--primary-fixed)]"
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
