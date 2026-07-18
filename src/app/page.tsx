import {
  signOutActiveSessionAction,
  switchActiveSessionAction,
} from "@/app/actions/session-actions";
import { listCashBankMovementsAction } from "@/app/actions/cash-bank-actions";
import { listChequesAction } from "@/app/actions/cheque-actions";
import { listEntityRowsAction } from "@/app/actions/entity-actions";
import { listExpensesAction } from "@/app/actions/expense-actions";
import { listPayrollAccrualsAction } from "@/app/actions/payroll-accrual-actions";
import { listProgressPaymentsAction } from "@/app/actions/progress-payment-actions";
import { listPurchaseInvoicesAction } from "@/app/actions/purchase-invoice-actions";
import { getNotificationUnreadCountAction } from "@/app/actions/notification-center-actions";
import { listTimesheetsAction } from "@/app/actions/timesheet-actions";
import { listTendersAction } from "@/app/actions/tender-actions";
import { AppShell } from "@/components/app-shell";
import {
  DashboardSurface,
  normalizeDashboardCompanyPeriodFilter,
} from "@/components/dashboard-surface";
import { requireActiveSessionState } from "@/lib/server-active-scope";

export const dynamic = "force-dynamic";

type HomeSearchParams = Promise<{
  period?: string | string[] | undefined;
}>;

export default async function Home({
  searchParams,
}: {
  searchParams?: HomeSearchParams;
}) {
  const query = searchParams ? await searchParams : {};
  const companyPeriodFilter = normalizeDashboardCompanyPeriodFilter(
    query.period,
  );
  const activeSession = await requireActiveSessionState();
  const [
    purchaseInvoiceResult,
    cashBankMovementResult,
    chequeResult,
    customerRowsResult,
    expenseResult,
    supplierRowsResult,
    subcontractorRowsResult,
    payrollAccrualResult,
    progressPaymentResult,
    timesheetResult,
    tenderResult,
    notificationUnreadCount,
  ] = await Promise.all([
    listPurchaseInvoicesAction(),
    listCashBankMovementsAction(),
    listChequesAction(),
    listEntityRowsAction("musteriler"),
    listExpensesAction(),
    listEntityRowsAction("tedarikciler"),
    listEntityRowsAction("taseronlar"),
    listPayrollAccrualsAction(),
    listProgressPaymentsAction(),
    listTimesheetsAction(),
    listTendersAction(),
    getNotificationUnreadCountAction(),
  ]);

  return (
    <AppShell
      activeSessionId={activeSession.sessionId}
      context={activeSession.scope}
      currentPath="/"
      notificationUnreadCount={notificationUnreadCount}
      sessionOptions={activeSession.sessionOptions}
      signOutAction={signOutActiveSessionAction}
      switchSessionAction={switchActiveSessionAction}
    >
      <DashboardSurface
        cashBankMovements={
          cashBankMovementResult.ok ? cashBankMovementResult.data.rows : []
        }
        cheques={chequeResult.ok ? chequeResult.data.rows : []}
        companyPeriodFilter={companyPeriodFilter}
        customerRows={customerRowsResult.ok ? customerRowsResult.data.rows : []}
        expenses={expenseResult.ok ? expenseResult.data.rows : []}
        payrollAccruals={
          payrollAccrualResult.ok ? payrollAccrualResult.data.rows : []
        }
        purchaseInvoices={
          purchaseInvoiceResult.ok ? purchaseInvoiceResult.data.rows : []
        }
        progressPayments={
          progressPaymentResult.ok ? progressPaymentResult.data.rows : []
        }
        subcontractorRows={
          subcontractorRowsResult.ok ? subcontractorRowsResult.data.rows : []
        }
        supplierRows={supplierRowsResult.ok ? supplierRowsResult.data.rows : []}
        tenders={tenderResult.ok ? tenderResult.data.rows : []}
        timesheets={timesheetResult.ok ? timesheetResult.data.rows : []}
      />
    </AppShell>
  );
}


