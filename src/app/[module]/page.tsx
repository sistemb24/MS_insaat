import { notFound } from "next/navigation";

import { globalSearchAction } from "@/app/actions/global-search-actions";
import { parseGlobalSearchDeepLinkParams } from "@/lib/global-search-domain";

import {
  approveManualBankTransactionMatchAction,
  createCashBankMovementFromBankTransactionAction,
  createPartialCashBankMovementFromBankTransactionAction,
  ignoreBankTransactionAction,
  approveBankTransactionMatchAction,
  listBankIntegrationOverviewAction,
  reopenBankTransactionMatchAction,
  reopenIgnoredBankTransactionAction,
  syncBankSandboxTransactionsAction,
  testBankSandboxConnectionAction,
} from "@/app/actions/bank-integration-actions";
import {
  activateVehicleCardAction,
  createVehicleCardAction,
  deactivateVehicleCardAction,
  listArventoVehicleFleetOverviewAction,
  testArventoSandboxConnectionAction,
  updateVehicleCardAction,
} from "@/app/actions/arvento-fleet-actions";
import {
  createApiKeyAction,
  listApiKeyOverviewAction,
  revokeApiKeyAction,
} from "@/app/actions/api-key-actions";
import {
  activateWebhookEndpointAction,
  createWebhookEndpointAction,
  deactivateWebhookEndpointAction,
  listWebhookEndpointOverviewAction,
  rotateWebhookEndpointSecretAction,
  updateWebhookEndpointAction,
} from "@/app/actions/webhook-endpoint-actions";
import {
  createCashBankMovementAction,
  createCashBankTransferAction,
  createCounterpartyCashBankMovementAction,
  listCashBankMovementsAction,
} from "@/app/actions/cash-bank-actions";
import {
  collectChequeAction,
  createChequeAction,
  listChequeAuditLogsAction,
  listChequesAction,
} from "@/app/actions/cheque-actions";
import {
  createEntityRowAction,
  deactivateEntityRowAction,
  importEntityRowsAction,
  listEntityRowsAction,
  updateEntityRowAction,
} from "@/app/actions/entity-actions";
import {
  createDocumentFileAction,
  createDocumentFolderAction,
  deleteDocumentFolderAction,
  renameDocumentFolderAction,
  renameDocumentFileAction,
  listDocumentCenterAction,
  moveDocumentFileToTrashAction,
  restoreDocumentFileFromTrashAction,
} from "@/app/actions/document-center-actions";
import {
  cancelDeliveryNoteAction,
  createDeliveryNoteAction,
  listDeliveryNoteAuditLogsAction,
  listDeliveryNotesAction,
  postDeliveryNoteAction,
  updateDeliveryNoteAction,
} from "@/app/actions/delivery-note-actions";
import {
  createExpenseAction,
  listExpensesAction,
} from "@/app/actions/expense-actions";
import {
  getNotificationUnreadCountAction,
  listNotificationCenterAction,
  markNotificationAsReadAction,
  setNotificationPreferenceAction,
} from "@/app/actions/notification-center-actions";
import {
  signOutActiveSessionAction,
  switchActiveSessionAction,
} from "@/app/actions/session-actions";
import {
  activateSubscriptionAddonCheckoutAction,
  activateSubscriptionPlanChangeAction,
  activateSubscriptionRenewalAction,
  createSubscriptionAddonCheckoutAction,
  createSubscriptionPlanChangeCheckoutAction,
  createSubscriptionRenewalCheckoutAction,
  failSubscriptionRenewalCheckoutAction,
  failSubscriptionAddonCheckoutAction,
  listSubscriptionOverviewAction,
} from "@/app/actions/subscription-actions";
import {
  listStockMinimumSettingsAction,
  saveStockMinimumSettingAction,
} from "@/app/actions/stock-minimum-setting-actions";
import {
  cancelStockMovementAction,
  createStockMovementAction,
  listStockMovementAuditLogsAction,
  listStockMovementsAction,
  postStockMovementAction,
} from "@/app/actions/stock-movement-actions";
import {
  listLedgerEntriesAction,
  listLedgerAuditLogsAction,
  getLedgerPeriodStatusAction,
  closeLedgerPeriodAction,
  reopenLedgerPeriodAction,
  postLedgerJournalAction,
} from "@/app/actions/ledger-actions";
import {
  createUserInvitationAction,
  resendUserInvitationAction,
  revokeUserInvitationAction,
} from "@/app/actions/user-invitation-actions";
import {
  deactivateUserAccessAction,
  listUserManagementOverviewAction,
  updateUserAccessRoleAction,
} from "@/app/actions/user-management-actions";
import {
  cancelPurchaseInvoiceAction,
  createPurchaseInvoiceAction,
  listPurchaseInvoiceAuditLogsAction,
  listPurchaseInvoicesAction,
  payPurchaseInvoiceAction,
  postPurchaseInvoiceAction,
  updatePurchaseInvoiceAction,
} from "@/app/actions/purchase-invoice-actions";
import {
  cancelSalesInvoiceAction,
  collectSalesInvoiceAction,
  createSalesInvoiceAction,
  listSalesInvoiceAuditLogsAction,
  listSalesInvoicesAction,
  postSalesInvoiceAction,
  updateSalesInvoiceAction,
} from "@/app/actions/sales-invoice-actions";
import {
  cancelProgressPaymentAction,
  collectProgressPaymentAction,
  createProgressPaymentAction,
  listProgressPaymentAuditLogsAction,
  listProgressPaymentsAction,
  payProgressPaymentAction,
  postProgressPaymentAction,
} from "@/app/actions/progress-payment-actions";
import {
  cancelPayrollAccrualAction,
  createPayrollAccrualFromTimesheetAction,
  listPayrollAccrualsAction,
  payPayrollAccrualAction,
  postPayrollAccrualAction,
} from "@/app/actions/payroll-accrual-actions";
import {
  createPersonnelAssetAction,
  listPersonnelAssetAuditLogsAction,
  listPersonnelAssetsAction,
  markPersonnelAssetLostAction,
  markPersonnelAssetUnusableAction,
  returnPersonnelAssetAction,
} from "@/app/actions/personnel-asset-actions";
import {
  cancelTimesheetAction,
  createTimesheetAction,
  listTimesheetAuditLogsAction,
  listTimesheetsAction,
  postTimesheetAction,
} from "@/app/actions/timesheet-actions";
import {
  convertTenderToSiteAction,
  createTenderAction,
  listTendersAction,
  transitionTenderStatusAction,
  updateTenderBoqAction,
} from "@/app/actions/tender-actions";
import { WorkplaceSafetySurface } from "@/components/workplace-safety-surface";
import { AppShell } from "@/components/app-shell";
import { ApiKeyManagementSurface } from "@/components/api-key-management-surface";
import { CashBankSurface } from "@/components/cash-bank-surface";
import { CounterpartyManagementSurface } from "@/components/counterparty-management-surface";
import { ChequeSurface } from "@/components/cheque-surface";
import { DocumentCenterSurface } from "@/components/document-center-surface";
import { EntityListSurface } from "@/components/entity-list-surface";
import { ExpenseSurface } from "@/components/expense-surface";
import { EFaturaSurface } from "@/components/e-fatura-surface";
import { ModuleSurface } from "@/components/module-surface";
import { NotificationCenterSurface } from "@/components/notification-center-surface";
import { PayrollAccrualSurface } from "@/components/payroll-accrual-surface";
import { PersonnelAssetSurface } from "@/components/personnel-asset-surface";
import { PersonnelWorkspaceHeader } from "@/components/personnel-workspace-header";
import { ProgressPaymentSurface } from "@/components/progress-payment-surface";
import { ConstructionProgressPaymentSurface } from "@/components/construction-progress-payment-surface";
import { InvoiceManagementSurface } from "@/components/invoice-management-surface";
import { ReportsSurface } from "@/components/reports-surface";
import { SettingsSurface } from "@/components/settings-surface";
import { SiteManagementSurface } from "@/components/site-management-surface";
import { StockDepotSurface } from "@/components/stock-depot-surface";
import { StockMovementSurface } from "@/components/stock-movement-surface";
import { SubscriptionLockedSurface } from "@/components/subscription-locked-surface";
import { SubscriptionSurface } from "@/components/subscription-surface";
import { TenderManagementSurface } from "@/components/tender-management-surface";
import { TimesheetSurface } from "@/components/timesheet-surface";
import { VehicleFleetSurface } from "@/components/vehicle-fleet-surface";
import type { AuditLogEntry } from "@/lib/audit-log";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { getDefaultArventoVehicleFleetOverview } from "@/lib/arvento-fleet-service";
import {
  getDefaultEFaturaOverview,
  getDefaultEFaturaProviderPlan,
  getDefaultEFaturaWebhookPlan,
} from "@/lib/e-fatura-service";
import { canMutateCheques } from "@/lib/cheque-service";
import { canMutateCashBankMovements } from "@/lib/cash-bank-movement-service";
import {
  buildBankTransactionMatchSuggestions,
  buildManualBankTransactionMatchCandidates,
} from "@/lib/bank-integration-service";
import { listDocumentSystemFolders } from "@/lib/document-center-service";
import { canMutateDeliveryNotes } from "@/lib/delivery-note-service";
import { getEntityDefinition, type EntityRow } from "@/lib/entities";
import { canMutateExpenses } from "@/lib/expense-service";
import { getModuleContent } from "@/lib/module-content";
import {
  counterpartyStatementRouteSlugs,
  getModuleBySlug,
  plannedRouteSlugs,
} from "@/lib/navigation";
import { canMutateProgressPayments } from "@/lib/progress-payment-service";
import { canMutatePersonnelAssets } from "@/lib/personnel-asset-service";
import { canMutatePurchaseInvoices } from "@/lib/purchase-invoice-service";
import { canMutateSalesInvoices } from "@/lib/sales-invoice-service";
import { summarizeOperationalReports } from "@/lib/reports-service";
import { requireActiveSessionState } from "@/lib/server-active-scope";
import { prisma } from "@/lib/prisma";
import {
  canLoadSubscriptionGuardedRouteData,
  findSubscriptionFeatureAccessRow,
  findSubscriptionRouteAccessRow,
  getSubscriptionFeatureKeyForRoute,
} from "@/lib/subscription-route-guard";
import { listTenderRows } from "@/lib/tender-service";
import { canMutateTimesheets } from "@/lib/timesheet-service";
import { canMutateStockMovements } from "@/lib/stock-movement-service";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return plannedRouteSlugs.map((module) => ({ module }));
}

export async function generateMetadata({ params }: ModulePageProps) {
  const { module } = await params;
  const navItem = getModuleBySlug(module);

  return {
    title: navItem ? `${navItem.label} | NOA İnşaat` : "NOA İnşaat",
  };
}

export default async function ModulePage({
  params,
  searchParams,
}: ModulePageProps) {
  const { module } = await params;
  const resolvedSearchParams: Record<
    string,
    string | string[] | undefined
  > = searchParams ? await searchParams : {};
  const requestedDocumentNo = getSingleSearchParam(resolvedSearchParams.evrak);
  const requestedImportBatchId = getSingleSearchParam(resolvedSearchParams.import);
  const requestedSafetyRecordId = getSingleSearchParam(resolvedSearchParams.isg);
  const globalSearchDeepLink = parseGlobalSearchDeepLinkParams({
    ara: resolvedSearchParams.ara,
    kayit: resolvedSearchParams.kayit,
  });
  const highlightedDocumentNo =
    globalSearchDeepLink?.query ?? requestedDocumentNo;
  const highlightedRecordId = globalSearchDeepLink?.recordId;
  const activeSession = await requireActiveSessionState();
  const activeScope = activeSession.scope;
  const entityDefinition = getEntityDefinition(module);
  const content = getModuleContent(module);
  const subscriptionOverviewResult =
    module === "abonelik" ||
    module === "ayarlar" ||
    Boolean(getSubscriptionFeatureKeyForRoute(module))
      ? await listSubscriptionOverviewAction()
      : undefined;
  const routeSubscriptionAccess =
    subscriptionOverviewResult?.ok
      ? findSubscriptionRouteAccessRow(
          subscriptionOverviewResult.data.overview,
          module,
        )
      : undefined;
  const canLoadRouteData =
    canLoadSubscriptionGuardedRouteData(routeSubscriptionAccess);
  const notificationCenterResult =
    module === "bildirimler" ? await listNotificationCenterAction() : undefined;
  const notificationUnreadCount = notificationCenterResult?.ok
    ? notificationCenterResult.data.model.summary.unreadCount
    : await getNotificationUnreadCountAction();
  const userManagementOverviewResult =
    module === "ayarlar"
      ? await listUserManagementOverviewAction()
      : undefined;
  const ledgerEntriesResult =
    module === "ayarlar" ? await listLedgerEntriesAction() : undefined;
  const ledgerAuditEntriesResult =
    module === "ayarlar" ? await listLedgerAuditLogsAction() : undefined;
  const ledgerPeriodStatusResult =
    module === "ayarlar" ? await getLedgerPeriodStatusAction() : undefined;
  const bankIntegrationOverviewResult =
    module === "ayarlar"
      ? await listBankIntegrationOverviewAction()
      : undefined;
  const settingsBankAccountRowsResult =
    module === "ayarlar" ? await listEntityRowsAction("kasa-banka") : undefined;
  const shouldLoadCounterpartyStatements = counterpartyStatementRouteSlugs.includes(
    module as (typeof counterpartyStatementRouteSlugs)[number],
  );
  const shouldLoadPurchaseInvoices =
    module === "faturalar" ||
    module === "santiyeler" ||
    module === "stok-depo" ||
    module === "raporlar" ||
    shouldLoadCounterpartyStatements;
  const [
    purchaseInvoiceResult,
    supplierRowsResult,
    siteRowsResult,
    purchaseInvoiceAuditResult,
    purchaseInvoicePaymentAccountRowsResult,
  ] =
    shouldLoadPurchaseInvoices
      ? await Promise.all([
          listPurchaseInvoicesAction(),
          module === "faturalar" ? listEntityRowsAction("tedarikciler") : undefined,
          module === "faturalar" ? listEntityRowsAction("santiyeler") : undefined,
          module === "faturalar" ? listPurchaseInvoiceAuditLogsAction() : undefined,
          module === "faturalar" ? listEntityRowsAction("kasa-banka") : undefined,
        ])
      : [undefined, undefined, undefined, undefined, undefined];
  const [chequeResult, chequeAuditResult, chequeAccountRowsResult] =
    (module === "cek" && canLoadRouteData) || module === "raporlar"
      ? await Promise.all([
          listChequesAction(),
          module === "cek" ? listChequeAuditLogsAction() : undefined,
          module === "cek" ? listEntityRowsAction("kasa-banka") : undefined,
        ])
      : [undefined, undefined, undefined];
  const cashBankMovementResult =
    module === "faturalar" ||
    module === "ayarlar" ||
    (module === "hakedis" && canLoadRouteData) ||
    module === "kasa-banka" ||
    module === "personel" ||
    module === "raporlar" ||
    shouldLoadCounterpartyStatements
      ? await listCashBankMovementsAction()
      : undefined;
  const shouldLoadExpenses =
    module === "giderler" ||
    module === "santiyeler" ||
    module === "raporlar" ||
    shouldLoadCounterpartyStatements;
  const [
    expenseResult,
    expenseSiteRowsResult,
    expenseAccountRowsResult,
  ] =
    shouldLoadExpenses
      ? await Promise.all([
          listExpensesAction(),
          module === "giderler" ? listEntityRowsAction("santiyeler") : undefined,
          module === "giderler" ? listEntityRowsAction("kasa-banka") : undefined,
        ])
      : [undefined, undefined, undefined];
  const shouldLoadProgressPayments =
    (module === "hakedis" && canLoadRouteData) ||
    module === "santiyeler" ||
    module === "raporlar" ||
    shouldLoadCounterpartyStatements;
  const [
    progressPaymentResult,
    progressPaymentSiteRowsResult,
    progressPaymentCounterpartyRowsResult,
    progressPaymentAuditResult,
    progressPaymentAccountRowsResult,
  ] =
    shouldLoadProgressPayments
      ? await Promise.all([
          listProgressPaymentsAction(),
          module === "hakedis" ? listEntityRowsAction("santiyeler") : undefined,
          module === "hakedis" ? listEntityRowsAction("taseronlar") : undefined,
          module === "hakedis" ? listProgressPaymentAuditLogsAction() : undefined,
          module === "hakedis" ? listEntityRowsAction("kasa-banka") : undefined,
        ])
      : [undefined, undefined, undefined, undefined, undefined];
  const [
    timesheetResult,
    timesheetPersonnelRowsResult,
    timesheetSiteRowsResult,
    timesheetSubcontractorRowsResult,
    timesheetAuditResult,
  ] =
    module === "puantaj" || module === "raporlar" || module === "santiyeler"
      ? await Promise.all([
          listTimesheetsAction(),
          module === "puantaj" ? listEntityRowsAction("personel") : undefined,
          module === "puantaj" ? listEntityRowsAction("santiyeler") : undefined,
          module === "puantaj" ? listEntityRowsAction("taseronlar") : undefined,
          module === "puantaj" ? listTimesheetAuditLogsAction() : undefined,
        ])
      : [undefined, undefined, undefined, undefined, undefined];
  const [salesInvoiceResult, customerRowsResult, salesInvoiceAuditResult] =
    shouldLoadPurchaseInvoices
      ? await Promise.all([
          listSalesInvoicesAction(),
          module === "faturalar" ? listEntityRowsAction("musteriler") : undefined,
          module === "faturalar" ? listSalesInvoiceAuditLogsAction() : undefined,
        ])
      : [undefined, undefined, undefined];
  const [personnelAssetResult, personnelAssetAuditResult, personnelAssetSiteRowsResult] =
    module === "personel"
      ? await Promise.all([
          listPersonnelAssetsAction(),
          listPersonnelAssetAuditLogsAction(),
          listEntityRowsAction("santiyeler"),
        ])
      : [undefined, undefined, undefined];
  const shouldLoadDeliveryNotes =
    module === "faturalar" || module === "raporlar" || module === "stok-depo";
  const [deliveryNoteResult, deliveryNoteAuditResult] = shouldLoadDeliveryNotes
    ? await Promise.all([
        listDeliveryNotesAction(),
        module === "faturalar" ? listDeliveryNoteAuditLogsAction() : undefined,
      ])
    : [undefined, undefined];
  const tenderResult =
    module === "ihale-yonetimi" && canLoadRouteData
      ? await listTendersAction()
      : undefined;
  const documentCenterResult =
    module === "dokuman-merkezi" && canLoadRouteData
      ? await listDocumentCenterAction()
      : undefined;
  const stockMinimumSettingResult =
    module === "stok-depo" ? await listStockMinimumSettingsAction() : undefined;
  const vehicleFleetOverviewResult =
    module === "araclar" && canLoadRouteData
      ? await listArventoVehicleFleetOverviewAction()
      : undefined;
  const apiKeyOverviewResult =
    module === "api-yonetimi" ? await listApiKeyOverviewAction() : undefined;
  const webhookEndpointOverviewResult =
    module === "api-yonetimi" ? await listWebhookEndpointOverviewAction() : undefined;
  const eFaturaWebhookAuditEntries =
    module === "e-fatura-yonetimi" && canLoadRouteData
      ? await auditLogRepository.listByEntityType({
          entityType: "e-fatura-webhook",
          limit: 20,
          scope: activeScope,
        })
      : [];
  const shouldLoadPayrollAccruals =
    module === "personel" ||
    module === "raporlar" ||
    module === "santiyeler" ||
    shouldLoadCounterpartyStatements;
  const [
    payrollAccrualResult,
    payrollSourceTimesheetResult,
    payrollPaymentAccountRowsResult,
  ] =
    module === "personel"
      ? await Promise.all([
          listPayrollAccrualsAction(),
          listTimesheetsAction(),
          listEntityRowsAction("kasa-banka"),
        ])
      : shouldLoadPayrollAccruals
        ? await Promise.all([listPayrollAccrualsAction(), undefined, undefined])
      : [undefined, undefined, undefined];
  const entityListResult = entityDefinition
    ? await listEntityRowsAction(module)
    : undefined;
  const counterpartyAccountRowsResult = shouldLoadCounterpartyStatements
    ? await listEntityRowsAction("kasa-banka")
    : undefined;
  const shouldLoadStockCards = module === "faturalar" || module === "stok-depo";
  const stockCardDefinition =
    module === "stok-depo" ? getEntityDefinition("stok-kartlari") : undefined;
  const stockCardRowsResult =
    shouldLoadStockCards ? await listEntityRowsAction("stok-kartlari") : undefined;
  const [stockMovementResult, stockMovementAuditResult, stockMovementSiteRowsResult] =
    module === "stok-depo"
      ? await Promise.all([
          listStockMovementsAction(),
          listStockMovementAuditLogsAction(),
          listEntityRowsAction("santiyeler"),
        ])
      : [undefined, undefined, undefined];
  const counterpartyStatementRows = shouldLoadCounterpartyStatements
    ? summarizeOperationalReports({
        cashBankMovements:
          cashBankMovementResult?.ok ? cashBankMovementResult.data.rows : [],
        cheques: [],
        expenses: expenseResult?.ok ? expenseResult.data.rows : [],
        payrollAccruals:
          payrollAccrualResult?.ok ? payrollAccrualResult.data.rows : [],
        progressPayments:
          progressPaymentResult?.ok ? progressPaymentResult.data.rows : [],
        purchaseInvoices:
          purchaseInvoiceResult?.ok ? purchaseInvoiceResult.data.rows : [],
        salesInvoices:
          salesInvoiceResult?.ok ? salesInvoiceResult.data.rows : [],
        timesheets: [],
        today: new Date().toISOString().slice(0, 10),
      }).counterpartyStatementDetailRows
    : [];

  if (!content && !entityDefinition) {
    notFound();
  }

  return (
    <AppShell
      activeSessionId={activeSession.sessionId}
      context={activeScope}
      currentPath={`/${module}`}
      globalSearchAction={globalSearchAction}
      notificationUnreadCount={notificationUnreadCount}
      sessionOptions={activeSession.sessionOptions}
      signOutAction={signOutActiveSessionAction}
      switchSessionAction={switchActiveSessionAction}
    >
      {routeSubscriptionAccess && !routeSubscriptionAccess.enabled ? (
        <SubscriptionLockedSurface
          access={routeSubscriptionAccess}
          routeLabel={getModuleBySlug(module)?.label ?? routeSubscriptionAccess.label}
        />
      ) : module === "faturalar" ? (
        <InvoiceManagementSurface
          deliveryNotes={{
            auditLogsByEntityId: groupAuditLogsByEntityId(
              deliveryNoteAuditResult?.ok ? deliveryNoteAuditResult.data.rows : [],
            ),
            canMutate: canMutateDeliveryNotes(activeScope),
            persistence: {
              cancelNote: cancelDeliveryNoteAction,
              createNote: createDeliveryNoteAction,
              postNote: postDeliveryNoteAction,
              updateNote: updateDeliveryNoteAction,
            },
            purchaseInvoices:
              purchaseInvoiceResult?.ok ? purchaseInvoiceResult.data.rows : [],
            rows: deliveryNoteResult?.ok ? deliveryNoteResult.data.rows : [],
            sites: toLookupOptions(siteRowsResult),
            stockCards: toStockCardOptions(stockCardRowsResult),
            suppliers: toLookupOptions(supplierRowsResult),
          }}
          purchase={{
            accountOptions: toCashBankAccountOptions(
              purchaseInvoicePaymentAccountRowsResult,
            ),
            auditLogsByEntityId: groupAuditLogsByEntityId(
              purchaseInvoiceAuditResult?.ok
                ? purchaseInvoiceAuditResult.data.rows
                : [],
            ),
            highlightedDocumentNo,
            highlightedRecordId,
            lookups: {
              sites: toLookupOptions(siteRowsResult),
              suppliers: toLookupOptions(supplierRowsResult),
            },
            paymentMovements:
              cashBankMovementResult?.ok ? cashBankMovementResult.data.rows : [],
            permissions: {
              canMutateInvoices: canMutatePurchaseInvoices(activeScope),
            },
            persistence: {
              allowPostedCancellation: true,
              cancelInvoice: cancelPurchaseInvoiceAction,
              createInvoice: createPurchaseInvoiceAction,
              payInvoice: payPurchaseInvoiceAction,
              postInvoice: postPurchaseInvoiceAction,
              updateInvoice: updatePurchaseInvoiceAction,
            },
            rows: purchaseInvoiceResult?.ok ? purchaseInvoiceResult.data.rows : [],
            stockCardOptions: toStockCardOptions(stockCardRowsResult),
          }}
          sales={{
            accountOptions: toCashBankAccountOptions(
              purchaseInvoicePaymentAccountRowsResult,
            ),
            auditLogsByEntityId: groupAuditLogsByEntityId(
              salesInvoiceAuditResult?.ok ? salesInvoiceAuditResult.data.rows : [],
            ),
            highlightedDocumentNo,
            highlightedRecordId,
            lookups: {
              customers: toLookupOptions(customerRowsResult),
              sites: toLookupOptions(siteRowsResult),
              suppliers: [],
            },
            permissions: {
              canMutateInvoices: canMutateSalesInvoices(activeScope),
            },
            paymentMovements:
              cashBankMovementResult?.ok ? cashBankMovementResult.data.rows : [],
            persistence: {
              allowPostedCancellation: true,
              cancelInvoice: cancelSalesInvoiceAction,
              collectInvoice: collectSalesInvoiceAction,
              createInvoice: createSalesInvoiceAction,
              postInvoice: postSalesInvoiceAction,
              updateInvoice: updateSalesInvoiceAction,
            },
            rows: salesInvoiceResult?.ok ? salesInvoiceResult.data.rows : [],
            stockCardOptions: toStockCardOptions(stockCardRowsResult),
          }}
        />
      ) : module === "cek" ? (
        <ChequeSurface
          accountOptions={toCashBankAccountOptions(chequeAccountRowsResult)}
          auditLogsByEntityId={groupAuditLogsByEntityId(
            chequeAuditResult?.ok ? chequeAuditResult.data.rows : [],
          )}
          highlightedRecordId={highlightedRecordId}
          initialSearchQuery={globalSearchDeepLink?.query}
          permissions={{
            canMutateCheques: canMutateCheques(activeScope),
          }}
          persistence={{
            collectCheque: collectChequeAction,
            createCheque: createChequeAction,
          }}
          rows={chequeResult?.ok ? chequeResult.data.rows : []}
        />
      ) : module === "kasa-banka" && entityDefinition ? (
        <CashBankSurface
          accountDefinition={entityDefinition}
          accountRows={entityListResult?.ok ? entityListResult.data.rows : []}
          highlightedDocumentNo={requestedDocumentNo}
          movements={
            cashBankMovementResult?.ok
              ? cashBankMovementResult.data.rows
              : []
          }
          permissions={{
            canMutateMovements: canMutateCashBankMovements(activeScope),
          }}
          persistence={{
            createMovement: createCashBankMovementAction,
            createTransfer: createCashBankTransferAction,
            createRow: createEntityRowAction,
            createRows: importEntityRowsAction,
            deactivateRow: deactivateEntityRowAction,
            listRows: listEntityRowsAction,
            updateRow: updateEntityRowAction,
          }}
        />
      ) : module === "giderler" ? (
        <ExpenseSurface
          accountOptions={toCashBankAccountOptions(expenseAccountRowsResult)}
          highlightedDocumentNo={requestedDocumentNo}
          lookups={{
            sites: toLookupOptions(expenseSiteRowsResult),
          }}
          paymentMovements={
            cashBankMovementResult?.ok ? cashBankMovementResult.data.rows : []
          }
          permissions={{
            canMutateExpenses: canMutateExpenses(activeScope),
          }}
          persistence={{
            createExpense: createExpenseAction,
          }}
          rows={expenseResult?.ok ? expenseResult.data.rows : []}
        />
      ) : module === "stok-depo" ? (
        <>
          <StockDepotSurface
            deliveryNotes={deliveryNoteResult?.ok ? deliveryNoteResult.data.rows : []}
            persistence={{
              saveMinimumSetting: saveStockMinimumSettingAction,
            }}
            purchaseInvoices={
              purchaseInvoiceResult?.ok ? purchaseInvoiceResult.data.rows : []
            }
            stockMovements={
              stockMovementResult?.ok ? stockMovementResult.data.rows : []
            }
            stockCardRows={
              stockCardRowsResult?.ok ? stockCardRowsResult.data.rows : []
            }
            stockMinimumSettings={
              stockMinimumSettingResult?.ok
                ? stockMinimumSettingResult.data.rows
                : []
            }
          />
          {stockCardDefinition ? (
            <EntityListSurface
              definition={stockCardDefinition}
              hideHeader
              initialRows={
                stockCardRowsResult?.ok ? stockCardRowsResult.data.rows : []
              }
              persistence={{
                createRow: createEntityRowAction,
                createRows: importEntityRowsAction,
                deactivateRow: deactivateEntityRowAction,
                listRows: listEntityRowsAction,
                updateRow: updateEntityRowAction,
              }}
            />
          ) : null}
          <StockMovementSurface
            auditLogsByEntityId={groupAuditLogsByEntityId(
              stockMovementAuditResult?.ok ? stockMovementAuditResult.data.rows : [],
            )}
            canMutate={canMutateStockMovements(activeScope)}
            deliveryNotes={deliveryNoteResult?.ok ? deliveryNoteResult.data.rows : []}
            persistence={{
              cancel: cancelStockMovementAction,
              create: createStockMovementAction,
              post: postStockMovementAction,
            }}
            purchaseInvoices={
              purchaseInvoiceResult?.ok ? purchaseInvoiceResult.data.rows : []
            }
            rows={stockMovementResult?.ok ? stockMovementResult.data.rows : []}
            siteRows={
              stockMovementSiteRowsResult?.ok
                ? stockMovementSiteRowsResult.data.rows
                : []
            }
            stockCardRows={
              stockCardRowsResult?.ok ? stockCardRowsResult.data.rows : []
            }
          />
        </>
      ) : module === "ihale-yonetimi" ? (
        <TenderManagementSurface
          highlightedRecordId={highlightedRecordId}
          initialSearchQuery={globalSearchDeepLink?.query}
          persistence={{
            convertTenderToSite: convertTenderToSiteAction,
            createTender: createTenderAction,
            transitionTenderStatus: transitionTenderStatusAction,
            updateTenderBoq: updateTenderBoqAction,
          }}
          rows={
            tenderResult?.ok && tenderResult.data.rows.length > 0
              ? tenderResult.data.rows
            : listTenderRows()
          }
        />
      ) : module === "bildirimler" ? (
        <NotificationCenterSurface
          initialEnabledCategoryKeys={
            notificationCenterResult?.ok
              ? notificationCenterResult.data.enabledCategoryKeys
              : undefined
          }
          persistence={{
            markAsRead: markNotificationAsReadAction,
            setPreference: setNotificationPreferenceAction,
          }}
          rows={notificationCenterResult?.ok ? notificationCenterResult.data.rows : []}
        />
      ) : module === "dokuman-merkezi" ? (
        <DocumentCenterSurface
          folders={
            documentCenterResult?.ok
              ? documentCenterResult.data.folders
              : listDocumentSystemFolders()
          }
          initialFiles={
            documentCenterResult?.ok ? documentCenterResult.data.files : []
          }
          initialTrashedFiles={
            documentCenterResult?.ok
              ? documentCenterResult.data.trashedFiles
              : []
          }
          persistence={{
            createFile: createDocumentFileAction,
            createFolder: createDocumentFolderAction,
            deleteFolder: deleteDocumentFolderAction,
            renameFolder: renameDocumentFolderAction,
            renameFile: renameDocumentFileAction,
            moveFileToTrash: moveDocumentFileToTrashAction,
            restoreFileFromTrash: restoreDocumentFileFromTrashAction,
          }}
        />
      ) : module === "hakedis" ? (
        <>
        <ConstructionProgressPaymentSurface
          canManageMeasurementImports={
            activeScope.userRole === "admin"
            || activeScope.userRole === "accounting"
          }
          initialImportBatchId={requestedImportBatchId}
          initialSimulationScenarioId={
            requestedImportBatchId
              ? undefined
              : getSingleSearchParam(resolvedSearchParams.senaryo)
          }
        />
        <ProgressPaymentSurface
          accountOptions={toCashBankAccountOptions(
            progressPaymentAccountRowsResult,
          )}
          auditLogsByEntityId={groupAuditLogsByEntityId(
            progressPaymentAuditResult?.ok
              ? progressPaymentAuditResult.data.rows
              : [],
          )}
          lookups={{
            counterparties: toLookupOptions(progressPaymentCounterpartyRowsResult),
            sites: toLookupOptions(progressPaymentSiteRowsResult),
          }}
          permissions={{
            canMutateProgressPayments: canMutateProgressPayments(activeScope),
          }}
          persistence={{
            cancelProgressPayment: cancelProgressPaymentAction,
            collectProgressPayment: collectProgressPaymentAction,
            createProgressPayment: createProgressPaymentAction,
            payProgressPayment: payProgressPaymentAction,
            postProgressPayment: postProgressPaymentAction,
          }}
          highlightedDocumentNo={requestedDocumentNo}
          paymentMovements={
            cashBankMovementResult?.ok ? cashBankMovementResult.data.rows : []
          }
          rows={
            progressPaymentResult?.ok ? progressPaymentResult.data.rows : []
          }
        />
        </>
      ) : module === "isg" ? (
        <WorkplaceSafetySurface
          canMutate={activeScope.userRole !== "viewer" && !activeScope.periodClosed}
          initialRecordId={requestedSafetyRecordId}
        />
      ) : module === "puantaj" ? (
        <TimesheetSurface
          auditLogsByEntityId={groupAuditLogsByEntityId(
            timesheetAuditResult?.ok ? timesheetAuditResult.data.rows : [],
          )}
          lookups={{
            personnel: toLookupOptions(timesheetPersonnelRowsResult),
            sites: toLookupOptions(timesheetSiteRowsResult),
            subcontractors: toLookupOptions(timesheetSubcontractorRowsResult),
          }}
          permissions={{
            canMutateTimesheets: canMutateTimesheets(activeScope),
          }}
          persistence={{
            cancelTimesheet: cancelTimesheetAction,
            createTimesheet: createTimesheetAction,
            postTimesheet: postTimesheetAction,
          }}
          rows={timesheetResult?.ok ? timesheetResult.data.rows : []}
        />
      ) : module === "personel" && entityDefinition ? (
        <>
          <PersonnelWorkspaceHeader
            paymentMovements={
              cashBankMovementResult?.ok
                ? cashBankMovementResult.data.rows
                : []
            }
            payrollAccruals={
              payrollAccrualResult?.ok ? payrollAccrualResult.data.rows : []
            }
            personnelRows={entityListResult?.ok ? entityListResult.data.rows : []}
            siteRows={
              personnelAssetSiteRowsResult?.ok
                ? personnelAssetSiteRowsResult.data.rows
                : []
            }
          />
          <EntityListSurface
            definition={entityDefinition}
            hideHeader
            initialRows={entityListResult?.ok ? entityListResult.data.rows : []}
            persistence={{
              createRow: createEntityRowAction,
              createRows: importEntityRowsAction,
              deactivateRow: deactivateEntityRowAction,
              listRows: listEntityRowsAction,
              updateRow: updateEntityRowAction,
            }}
          />
          <PersonnelAssetSurface
            auditLogsByEntityId={groupAuditLogsByEntityId(
              personnelAssetAuditResult?.ok ? personnelAssetAuditResult.data.rows : [],
            )}
            canMutate={canMutatePersonnelAssets(activeScope)}
            persistence={{
              assign: createPersonnelAssetAction,
              markLost: markPersonnelAssetLostAction,
              markUnusable: markPersonnelAssetUnusableAction,
              returnAsset: returnPersonnelAssetAction,
            }}
            personnelRows={entityListResult?.ok ? entityListResult.data.rows : []}
            rows={personnelAssetResult?.ok ? personnelAssetResult.data.rows : []}
            siteRows={
              personnelAssetSiteRowsResult?.ok
                ? personnelAssetSiteRowsResult.data.rows
                : []
            }
          />
          <PayrollAccrualSurface
            accountOptions={toCashBankAccountOptions(
              payrollPaymentAccountRowsResult,
            )}
            highlightedDocumentNo={requestedDocumentNo}
            paymentMovements={
              cashBankMovementResult?.ok
                ? cashBankMovementResult.data.rows
                : []
            }
            persistence={{
              cancelPayrollAccrual: cancelPayrollAccrualAction,
              createPayrollAccrualFromTimesheet:
                createPayrollAccrualFromTimesheetAction,
              payPayrollAccrual: payPayrollAccrualAction,
              postPayrollAccrual: postPayrollAccrualAction,
            }}
            rows={
              payrollAccrualResult?.ok
                ? payrollAccrualResult.data.rows
                : []
            }
            sourceTimesheets={
              payrollSourceTimesheetResult?.ok
                ? payrollSourceTimesheetResult.data.rows
                : []
            }
          />
        </>
      ) : module === "raporlar" ? (
        <ReportsSurface
          cashBankMovements={
            cashBankMovementResult?.ok ? cashBankMovementResult.data.rows : []
          }
          cheques={chequeResult?.ok ? chequeResult.data.rows : []}
          expenses={expenseResult?.ok ? expenseResult.data.rows : []}
          deliveryNotes={deliveryNoteResult?.ok ? deliveryNoteResult.data.rows : []}
          payrollAccruals={
            payrollAccrualResult?.ok ? payrollAccrualResult.data.rows : []
          }
          purchaseInvoices={
            purchaseInvoiceResult?.ok ? purchaseInvoiceResult.data.rows : []
          }
          salesInvoices={
            salesInvoiceResult?.ok ? salesInvoiceResult.data.rows : []
          }
          progressPayments={
            progressPaymentResult?.ok ? progressPaymentResult.data.rows : []
          }
          timesheets={timesheetResult?.ok ? timesheetResult.data.rows : []}
        />
      ) : module === "abonelik" ? (
        <SubscriptionSurface
          activateAddonCheckoutAction={activateSubscriptionAddonCheckoutAction}
          activatePlanChangeAction={activateSubscriptionPlanChangeAction}
          activateRenewalAction={activateSubscriptionRenewalAction}
          createAddonCheckoutAction={createSubscriptionAddonCheckoutAction}
          createPlanChangeCheckoutAction={
            createSubscriptionPlanChangeCheckoutAction
          }
          createRenewalCheckoutAction={createSubscriptionRenewalCheckoutAction}
          failAddonCheckoutAction={failSubscriptionAddonCheckoutAction}
          failRenewalCheckoutAction={failSubscriptionRenewalCheckoutAction}
          overview={subscriptionOverviewResult!.data.overview}
        />
      ) : module === "api-yonetimi" ? (
        <ApiKeyManagementSurface
          overview={apiKeyOverviewResult!.data.overview}
          persistence={{
            activateWebhookEndpoint: activateWebhookEndpointAction,
            createKey: createApiKeyAction,
            createWebhookEndpoint: createWebhookEndpointAction,
            deactivateWebhookEndpoint: deactivateWebhookEndpointAction,
            rotateWebhookEndpointSecret: rotateWebhookEndpointSecretAction,
            updateWebhookEndpoint: updateWebhookEndpointAction,
            revokeKey: revokeApiKeyAction,
          }}
          userRole={activeScope.userRole}
          webhookEndpointOverview={
            webhookEndpointOverviewResult?.ok
              ? webhookEndpointOverviewResult.data.overview
              : undefined
          }
        />
      ) : module === "e-fatura-yonetimi" ? (
        <EFaturaSurface
          content={content!}
          overview={getDefaultEFaturaOverview()}
          providerPlan={getDefaultEFaturaProviderPlan()}
          webhookAuditEntries={eFaturaWebhookAuditEntries}
          webhookPlan={getDefaultEFaturaWebhookPlan()}
        />
      ) : module === "ayarlar" ? (
        <SettingsSurface
          ledgerEntries={ledgerEntriesResult ?? []}
          ledgerAuditEntries={ledgerAuditEntriesResult ?? []}
          ledgerPeriodClosed={ledgerPeriodStatusResult?.isClosed ?? false}
          arventoFleetFeatureAccess={
            subscriptionOverviewResult?.ok
              ? findSubscriptionFeatureAccessRow(
                  subscriptionOverviewResult.data.overview,
                  "arvento-fleet",
                )
              : undefined
          }
          bankCashBankAccountOptions={toCashBankAccountOptions(
            settingsBankAccountRowsResult,
          )}
          bankIntegrationFeatureAccess={
            subscriptionOverviewResult?.ok
              ? findSubscriptionFeatureAccessRow(
                  subscriptionOverviewResult.data.overview,
                  "bank-integration",
                )
              : undefined
          }
          bankIntegrationOverview={
            bankIntegrationOverviewResult?.ok
              ? {
                  ...bankIntegrationOverviewResult.data.overview,
                  manualMatchCandidates:
                    buildManualBankTransactionMatchCandidates(
                      cashBankMovementResult?.ok
                        ? cashBankMovementResult.data.rows
                        : [],
                    ),
                  matchSuggestions: buildBankTransactionMatchSuggestions({
                    cashBankMovements:
                      cashBankMovementResult?.ok
                        ? cashBankMovementResult.data.rows
                        : [],
                    transactions:
                      bankIntegrationOverviewResult.data.overview
                        .recentTransactions,
                  }),
                }
              : undefined
          }
          context={activeScope}
          persistence={{
            postLedgerJournal: postLedgerJournalAction,
            closeLedgerPeriod: closeLedgerPeriodAction,
            reopenLedgerPeriod: reopenLedgerPeriodAction,
            approveManualBankMatch: approveManualBankTransactionMatchAction,
            approveBankMatch: approveBankTransactionMatchAction,
            createCashBankMovementFromBankTransaction:
              createCashBankMovementFromBankTransactionAction,
            createPartialCashBankMovementFromBankTransaction:
              createPartialCashBankMovementFromBankTransactionAction,
            createInvitation: createUserInvitationAction,
            deactivateUser: deactivateUserAccessAction,
            updateUserRole: updateUserAccessRoleAction,
            ignoreBankTransaction: ignoreBankTransactionAction,
            reopenBankMatch: reopenBankTransactionMatchAction,
            reopenIgnoredBankTransaction: reopenIgnoredBankTransactionAction,
            resendInvitation: resendUserInvitationAction,
            revokeInvitation: revokeUserInvitationAction,
            syncBankTransactions: syncBankSandboxTransactionsAction,
            testArventoConnection: testArventoSandboxConnectionAction,
            testBankConnection: testBankSandboxConnectionAction,
          }}
          userManagementOverview={
            userManagementOverviewResult?.ok
              ? userManagementOverviewResult.data.overview
              : undefined
          }
        />
      ) : module === "araclar" ? (
        <VehicleFleetSurface
          auditEntries={
            vehicleFleetOverviewResult?.ok
              ? vehicleFleetOverviewResult.data.auditEntries
              : []
          }
          overview={
            vehicleFleetOverviewResult?.ok
              ? vehicleFleetOverviewResult.data.overview
              : getDefaultArventoVehicleFleetOverview()
          }
          persistence={{
            activateVehicleCard: activateVehicleCardAction,
            createVehicleCard: createVehicleCardAction,
            deactivateVehicleCard: deactivateVehicleCardAction,
            updateVehicleCard: updateVehicleCardAction,
          }}
          vehicleCards={
            vehicleFleetOverviewResult?.ok
              ? vehicleFleetOverviewResult.data.vehicleCards
              : []
          }
        />
      ) : module === "santiyeler" && entityDefinition ? (
        <SiteManagementSurface
          definition={entityDefinition}
          initialRows={entityListResult?.ok ? entityListResult.data.rows : []}
          persistence={{
            createRow: createEntityRowAction,
            createRows: importEntityRowsAction,
            deactivateRow: deactivateEntityRowAction,
            listRows: listEntityRowsAction,
            updateRow: updateEntityRowAction,
          }}
          expenses={expenseResult?.ok ? expenseResult.data.rows : []}
          payrollAccruals={payrollAccrualResult?.ok ? payrollAccrualResult.data.rows : []}
          progressPayments={progressPaymentResult?.ok ? progressPaymentResult.data.rows : []}
          purchaseInvoices={purchaseInvoiceResult?.ok ? purchaseInvoiceResult.data.rows : []}
          salesInvoices={salesInvoiceResult?.ok ? salesInvoiceResult.data.rows : []}
          timesheets={timesheetResult?.ok ? timesheetResult.data.rows : []}
        />
      ) : shouldLoadCounterpartyStatements && entityDefinition ? (
        <CounterpartyManagementSurface
          definition={entityDefinition}
          initialRows={entityListResult?.ok ? entityListResult.data.rows : []}
          persistence={{
            createRow: createEntityRowAction,
            createRows: importEntityRowsAction,
            createCounterpartyMovement: createCounterpartyCashBankMovementAction,
            deactivateRow: deactivateEntityRowAction,
            listRows: listEntityRowsAction,
            updateRow: updateEntityRowAction,
          }}
          cashBankAccountOptions={toCashBankAccountOptions(counterpartyAccountRowsResult)}
          statementRows={counterpartyStatementRows}
        />
      ) : entityDefinition ? (
        <EntityListSurface
          definition={entityDefinition}
          initialRows={entityListResult?.ok ? entityListResult.data.rows : []}
          persistence={{
            createRow: createEntityRowAction,
            createRows: importEntityRowsAction,
            createCounterpartyMovement: shouldLoadCounterpartyStatements
              ? createCounterpartyCashBankMovementAction
              : undefined,
            deactivateRow: deactivateEntityRowAction,
            listRows: listEntityRowsAction,
            updateRow: updateEntityRowAction,
          }}
          cashBankAccountOptions={toCashBankAccountOptions(counterpartyAccountRowsResult)}
          statementRows={counterpartyStatementRows}
        />
      ) : (
        <ModuleSurface content={content!} />
      )}
    </AppShell>
  );
}

function toLookupOptions(
  result: Awaited<ReturnType<typeof listEntityRowsAction>> | undefined,
) {
  if (!result?.ok) {
    return [];
  }

  return result.data.rows.map((row) => ({
    code: row.code,
    name: row.name,
  }));
}

function toCashBankAccountOptions(
  result: Awaited<ReturnType<typeof listEntityRowsAction>> | undefined,
) {
  if (!result?.ok) {
    return [];
  }

  return result.data.rows.filter(isActiveEntityRow).map((row) => ({
    code: row.code,
    name: row.name,
  }));
}

function toStockCardOptions(
  result: Awaited<ReturnType<typeof listEntityRowsAction>> | undefined,
) {
  if (!result?.ok) {
    return [];
  }

  return result.data.rows.filter(isActiveEntityRow).map((row) => ({
    code: row.code,
    defaultWarehouse: row.defaultWarehouse ?? "",
    name: row.name,
    unit: row.unit || "Adet",
  }));
}

function isActiveEntityRow(row: EntityRow) {
  return row.status !== "Pasif";
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}

function groupAuditLogsByEntityId(rows: AuditLogEntry[]) {
  return rows.reduce<Record<string, AuditLogEntry[]>>((groups, row) => {
    groups[row.entityId] = [...(groups[row.entityId] ?? []), row];

    return groups;
  }, {});
}















