"use client";

import { useEffect, useState } from "react";

import {
  getArventoCredentialReadiness,
  getDefaultArventoFleetOverview,
  validateArventoCredentialDraft,
  type ArventoFleetConnectionSettings,
  type ArventoFleetOverview,
  type ArventoFleetResult,
} from "@/lib/arvento-fleet-service";
import {
  buildBankTransactionCashBankMovementDrafts,
  buildBankLedgerReconciliationIssues,
  buildBankTransactionPartialCashBankMovementDrafts,
  buildBankTransactionPartialReconciliationDrafts,
  evaluateManualBankTransactionMatchCandidates,
  bankLedgerReconciliationIssueTypes,
  getBankLedgerReconciliationIssueLabel,
  isPartialCashBankMovementForTransaction,
  summarizeActiveBankLedgerByAccount,
} from "@/lib/bank-integration-service";
import type {
  BankIntegrationConnectionRow,
  BankIntegrationConnectionView,
  BankIntegrationOverview,
  BankIntegrationResult,
  BankIntegrationTestValues,
  BankLedgerReconciliationIssueType,
  BankTransactionManualMatchCandidate,
  BankTransactionSyncDateRange,
  BankTransactionManualMatchCandidateEvaluation,
  BankTransactionRow,
  BankTransactionView,
} from "@/lib/bank-integration-service";
import type {
  CashBankAccountOption,
  CashBankMovementRow,
} from "@/lib/cash-bank-movement-service";
import { getP0SettingsContract } from "@/lib/settings-contract";
import type {
  SettingsFinancePolicyRow,
  SettingsUserInvitePolicy,
  SettingsUserTypeRow,
} from "@/lib/settings-contract";
import type { SubscriptionFeatureAccessRow } from "@/lib/subscription-service";
import type { TenantScope } from "@/lib/tenant-scope";
import type { LedgerJournalDraft, LedgerJournalRow } from "@/lib/ledger-service";
import type { AuditLogEntry } from "@/lib/audit-log";
import {
  createCompanyProfileFallback,
  type CompanyProfileSaveInput,
  type CompanyProfileValues,
  type EffectiveCompanyProfile,
} from "@/lib/company-profile";
import type { CompanyProfileResult } from "@/lib/company-profile-service";
import type { EffectiveCompanyBrandAsset } from "@/lib/company-brand-asset";
import type { CompanyBrandAssetResult } from "@/lib/company-brand-asset-service";
import type {
  EffectiveSupplierCategory,
  SupplierCategorySaveValues,
  SupplierCategoryStatusValues,
} from "@/lib/supplier-category";
import type { SupplierCategoryResult } from "@/lib/supplier-category-service";
import type {
  CustomerTypeSaveValues,
  CustomerTypeStatusValues,
  EffectiveCustomerType,
} from "@/lib/customer-type";
import type { CustomerTypeResult } from "@/lib/customer-type-service";
import type {
  AccessProfileAssignmentValues,
  AccessProfileOverview,
  AccessProfileSaveValues,
  AccessProfileStatusValues,
} from "@/lib/access-profile";
import type { AccessProfileResult } from "@/lib/access-profile-service";
import { CUSTOM_RBAC_USER_TYPE } from "@/lib/user-invitation-access-profile";
import type {
  CompanyLocationDirectoryRow,
  CompanyLocationSaveInput,
} from "@/lib/company-location";
import type { CompanyLocationResult } from "@/lib/company-location-service";
import {
  FINANCE_SETTINGS_FALLBACK,
  type EffectiveFinanceSettings,
  type FinanceSettingsSaveInput,
} from "@/lib/finance-settings";
import type { FinanceSettingsResult } from "@/lib/finance-settings-service";
import type {
  UserInvitationCreateValues,
  UserInvitationResult,
  UserInvitationRow,
} from "@/lib/user-invitation-service";
import type {
  UserManagementOverview,
  UserManagementResult,
} from "@/lib/user-management-service";
import { LedgerSurface } from "@/components/ledger-surface";
import { CompanyLocationDirectoryPanel } from "@/components/company-location-directory-panel";
import { CompanyBrandAssetPanel } from "@/components/company-brand-asset-panel";
import { SupplierCategoryPanel } from "@/components/supplier-category-panel";
import { CustomerTypePanel } from "@/components/customer-type-panel";
import { AccessProfilePanel } from "@/components/access-profile-panel";
import { getRbacPermissionRoles, type RbacPermission } from "@/lib/rbac";

type BankTransactionStatusFilter =
  | "all"
  | "partial"
  | BankTransactionRow["status"];

type BankLedgerStatusFilter = "all" | "active" | "voided";

type BankLedgerRecoveryFilter = "all" | "retryable" | "recovered";
type BankLedgerRecoveryFlowFilter =
  | "all"
  | "Eşleştirme"
  | "Yeni kasa/banka"
  | "Parçalı kasa/banka";
type BankLedgerReconciliationIssueFilter =
  | "all"
  | BankLedgerReconciliationIssueType;

const bankLedgerReconciliationIssueFilters: BankLedgerReconciliationIssueFilter[] = [
  "all",
  ...bankLedgerReconciliationIssueTypes,
];

const bankTransactionStatusFilters: BankTransactionStatusFilter[] = [
  "all",
  "pending",
  "matched",
  "ignored",
  "partial",
];

const bankTransactionStatusFilterLabels: Record<
  BankTransactionStatusFilter,
  string
> = {
  all: "Tümü",
  ignored: "Yoksayıldı",
  matched: "Eşleştirildi",
  pending: "Bekliyor",
  partial: "Parçalı",
};

type SettingsSurfaceProps = {
  ledgerEntries?: LedgerJournalRow[];
  ledgerAuditEntries?: AuditLogEntry[];
  ledgerPeriodClosed?: boolean;
  arventoFleetFeatureAccess?: SubscriptionFeatureAccessRow;
  arventoFleetOverview?: ArventoFleetOverview;
  bankCashBankAccountOptions?: CashBankAccountOption[];
  bankIntegrationFeatureAccess?: SubscriptionFeatureAccessRow;
  bankIntegrationOverview?: BankIntegrationOverview;
  context: TenantScope;
  companyLocations?: CompanyLocationDirectoryRow[];
  companyBrandAsset?: EffectiveCompanyBrandAsset;
  companyProfile?: EffectiveCompanyProfile;
  customerTypes?: EffectiveCustomerType[];
  accessProfileOverview?: AccessProfileOverview;
  supplierCategories?: EffectiveSupplierCategory[];
  financeSettings?: EffectiveFinanceSettings;
  persistence?: {
    assignAccessProfile?: (
      values: AccessProfileAssignmentValues,
    ) => Promise<AccessProfileResult<{ assignment: AccessProfileOverview["users"][number]["assignment"]; idempotent: boolean }>>;
    changeAccessProfileStatus?: (
      values: AccessProfileStatusValues,
    ) => Promise<AccessProfileResult<{ idempotent: boolean; profile: AccessProfileOverview["profiles"][number] }>>;
    changeCustomerTypeStatus?: (
      values: CustomerTypeStatusValues,
    ) => Promise<
      CustomerTypeResult<{
        customerType: EffectiveCustomerType;
        idempotent: boolean;
      }>
    >;
    changeSupplierCategoryStatus?: (
      values: SupplierCategoryStatusValues,
    ) => Promise<
      SupplierCategoryResult<{
        category: EffectiveSupplierCategory;
        idempotent: boolean;
      }>
    >;
    removeCompanyBrandAsset?: (values: {
      expectedRevisionNo: number;
      requestKey: string;
    }) => Promise<
      CompanyBrandAssetResult<{
        asset: EffectiveCompanyBrandAsset;
        idempotent: boolean;
      }>
    >;
    saveCompanyLocation?: (
      values: CompanyLocationSaveInput,
    ) => Promise<
      CompanyLocationResult<{
        idempotent: boolean;
        location: CompanyLocationDirectoryRow;
      }>
    >;
    saveCompanyProfile?: (
      values: CompanyProfileSaveInput,
    ) => Promise<
      CompanyProfileResult<{
        idempotent: boolean;
        profile: EffectiveCompanyProfile;
      }>
    >;
    saveCustomerType?: (
      values: CustomerTypeSaveValues,
    ) => Promise<
      CustomerTypeResult<{
        customerType: EffectiveCustomerType;
        idempotent: boolean;
      }>
    >;
    saveAccessProfile?: (
      values: AccessProfileSaveValues,
    ) => Promise<AccessProfileResult<{ idempotent: boolean; profile: AccessProfileOverview["profiles"][number] }>>;
    saveSupplierCategory?: (
      values: SupplierCategorySaveValues,
    ) => Promise<
      SupplierCategoryResult<{
        category: EffectiveSupplierCategory;
        idempotent: boolean;
      }>
    >;
    uploadCompanyBrandAsset?: (
      formData: FormData,
    ) => Promise<
      CompanyBrandAssetResult<{
        asset: EffectiveCompanyBrandAsset;
        idempotent: boolean;
      }>
    >;
    saveFinanceSettings?: (
      values: FinanceSettingsSaveInput,
    ) => Promise<
      FinanceSettingsResult<{
        idempotent: boolean;
        settings: EffectiveFinanceSettings;
      }>
    >;
    postLedgerJournal?: (draft: LedgerJournalDraft) => Promise<
      | { ok: true; data: LedgerJournalRow }
      | { ok: false; errors: string[] }
    >;
    closeLedgerPeriod?: () => Promise<{ ok: true } | { ok: false; errors: string[] }>;
    reopenLedgerPeriod?: () => Promise<{ ok: true } | { ok: false; errors: string[] }>;
    approveBankMatch?: (values: {
      cashBankMovementId: string;
      transactionId: string;
    }) => Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    >;
    ignoreBankTransaction?: (
      transactionId: string,
    ) => Promise<BankIntegrationResult<{ transaction: BankTransactionRow }>>;
    approveManualBankMatch?: (values: {
      cashBankMovementId: string;
      transactionId: string;
    }) => Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    >;
    createCashBankMovementFromBankTransaction?: (
      transactionId: string,
      account?: CashBankAccountOption,
    ) => Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    >;
    createPartialCashBankMovementFromBankTransaction?: (
      transactionId: string,
      cashBankMovementId: string,
      account?: CashBankAccountOption,
    ) => Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    >;
    createInvitation?: (
      values: UserInvitationCreateValues,
    ) => Promise<
      UserInvitationResult<{ invitation: UserInvitationRow; token: string }>
    >;
    deactivateUser?: (
      accessId: string,
    ) => Promise<
      UserManagementResult<{
        deactivatedAccess: {
          email: string | null;
          id: string;
          role: string;
          userId: string;
          userName: string;
        };
        removedAccessProfileId: string | null;
      }>
    >;
    updateUserRole?: (
      accessId: string,
      role: "admin" | "accounting" | "viewer",
    ) => Promise<UserManagementResult<{
      removedAccessProfileId: string | null;
      updatedAccess: {
        email: string | null;
        id: string;
        role: string;
        userId: string;
        userName: string;
      };
    }>>;
    resendInvitation?: (
      invitationId: string,
    ) => Promise<
      UserInvitationResult<{ invitation: UserInvitationRow; token: string }>
    >;
    reopenBankMatch?: (
      transactionId: string,
    ) => Promise<BankIntegrationResult<{ transaction: BankTransactionRow }>>;
    reopenIgnoredBankTransaction?: (
      transactionId: string,
    ) => Promise<BankIntegrationResult<{ transaction: BankTransactionRow }>>;
    revokeInvitation?: (
      invitationId: string,
    ) => Promise<UserInvitationResult<{ invitation: UserInvitationRow }>>;
    testArventoConnection?: () => Promise<
      ArventoFleetResult<{ connection: ArventoFleetConnectionSettings }>
    >;
    testBankConnection?: (
      values: BankIntegrationTestValues,
    ) => Promise<
      BankIntegrationResult<{ connection: BankIntegrationConnectionRow }>
    >;
    syncBankTransactions?: (
      connectionId: string,
      dateRange?: BankTransactionSyncDateRange,
    ) => Promise<
      BankIntegrationResult<{
        preservedStatusCount: number;
        syncedCount: number;
        transactions: BankTransactionRow[];
      }>
    >;
  };
  userManagementOverview?: UserManagementOverview;
};

export function SettingsSurface({
  accessProfileOverview,
  ledgerEntries = [],
  ledgerAuditEntries = [],
  ledgerPeriodClosed = false,
  arventoFleetFeatureAccess,
  arventoFleetOverview = getDefaultArventoFleetOverview(),
  bankCashBankAccountOptions = [],
  bankIntegrationFeatureAccess,
  bankIntegrationOverview = emptyBankIntegrationOverview,
  context,
  companyLocations: initialCompanyLocations = [],
  companyBrandAsset: initialCompanyBrandAsset = {
    canManage: context.userRole === "admin",
    dataUrl: null,
    height: null,
    mimeType: null,
    revisionNo: 0,
    sizeBytes: 0,
    source: "none",
    updatedAt: null,
    updatedBy: null,
    width: null,
  },
  companyProfile: initialCompanyProfile = {
    ...createCompanyProfileFallback(context.companyName),
    canManage: context.userRole === "admin",
    revisionNo: 0,
    source: "fallback",
    updatedAt: null,
    updatedBy: null,
  },
  financeSettings: initialFinanceSettings = {
    ...FINANCE_SETTINGS_FALLBACK,
    canManage: context.userRole === "admin" && !context.periodClosed,
    revisionNo: 0,
    source: "fallback",
    updatedAt: null,
    updatedBy: null,
  },
  customerTypes = [],
  supplierCategories = [],
  persistence,
  userManagementOverview = emptyUserManagementOverview,
}: SettingsSurfaceProps) {
  const [bankCode, setBankCode] = useState(
    bankIntegrationOverview.supportedBanks.find((bank) => bank.status === "Mevcut")
      ?.bankCode ?? "",
  );
  const [bankConsentId, setBankConsentId] = useState("");
  const [bankSyncDateFrom, setBankSyncDateFrom] = useState("");
  const [bankSyncDateTo, setBankSyncDateTo] = useState("");
  const [arventoUserName, setArventoUserName] = useState(
    arventoFleetOverview.connection.userName,
  );
  const [arventoPin1, setArventoPin1] = useState("");
  const [arventoPin2, setArventoPin2] = useState("");
  const [bankIntegration, setBankIntegration] = useState(bankIntegrationOverview);
  const [manualMatchSelectionByTransaction, setManualMatchSelectionByTransaction] =
    useState<Record<string, string>>({});
  const [cashBankAccountCodeByTransaction, setCashBankAccountCodeByTransaction] =
    useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteAccessProfileId, setInviteAccessProfileId] = useState("");
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const [overview, setOverview] = useState(userManagementOverview);
  const [companyProfile, setCompanyProfile] = useState(initialCompanyProfile);
  const [companyBrandAsset, setCompanyBrandAsset] = useState(
    initialCompanyBrandAsset,
  );
  const [companyLocations, setCompanyLocations] = useState(
    initialCompanyLocations,
  );
  const [isSavingCompanyProfile, setIsSavingCompanyProfile] = useState(false);
  const [financeSettings, setFinanceSettings] = useState(initialFinanceSettings);
  const [isSavingFinanceSettings, setIsSavingFinanceSettings] = useState(false);
  const settingsContract = getP0SettingsContract();
  const financeDisplayRows = settingsContract.financeDisplayRows.map((row) => {
    if (row.label === "Varsayılan KDV") {
      return { ...row, value: `%${financeSettings.defaultVatRate}` };
    }
    if (row.label === "KDV Dağılımı") {
      return {
        ...row,
        value: financeSettings.showVatBreakdown
          ? "KDV dağılımı aktif"
          : "KDV dağılımı kapalı",
      };
    }
    return row;
  });
  const financePolicyRows = settingsContract.financePolicyRows.map((row) => {
    if (row.field === "defaultVatRate") {
      return { ...row, value: `%${financeSettings.defaultVatRate}` };
    }
    if (row.field === "showVatBreakdown") {
      return {
        ...row,
        value: financeSettings.showVatBreakdown ? "Aktif" : "Kapalı",
      };
    }
    return row;
  });
  const arventoCredentialReadiness = getArventoCredentialReadiness({
    pin1: arventoPin1,
    pin2: arventoPin2,
    userName: arventoUserName,
  });
  function handlePrint() {
    setNotice(settingsContract.printAction.message);
    window.print();
  }

  async function handleSaveFinanceSettings(values: FinanceSettingsSaveInput) {
    if (!persistence?.saveFinanceSettings || !financeSettings.canManage) return;
    setIsSavingFinanceSettings(true);
    const result = await persistence.saveFinanceSettings(values);
    setIsSavingFinanceSettings(false);

    if (!result.ok) {
      setNotice(result.errors.join(" "));
      return;
    }

    setFinanceSettings(result.data.settings);
    setNotice(
      result.data.idempotent
        ? "Finans ayarları daha önce kaydedilmiş işlemden okundu."
        : "Finans ayarları kaydedildi; yeni finans belgelerinde uygulanacak.",
    );
  }

  async function handleSaveCompanyProfile(values: CompanyProfileSaveInput) {
    if (!persistence?.saveCompanyProfile || !companyProfile.canManage) return;
    setIsSavingCompanyProfile(true);
    const result = await persistence.saveCompanyProfile(values);
    setIsSavingCompanyProfile(false);

    if (!result.ok) {
      setNotice(result.errors.join(" "));
      return;
    }

    setCompanyProfile(result.data.profile);
    setNotice(
      result.data.idempotent
        ? "Firma profili daha önce kaydedilmiş işlemden okundu."
        : "Firma profili kaydedildi; yeni belge başlıklarında uygulanacak.",
    );
  }

  async function handleUploadCompanyBrandAsset(formData: FormData) {
    if (!persistence?.uploadCompanyBrandAsset || !companyBrandAsset.canManage) {
      return { errors: ["Firma logosu yükleme yetkisi bulunamadı."], ok: false as const };
    }
    const result = await persistence.uploadCompanyBrandAsset(formData);
    if (result.ok) setCompanyBrandAsset(result.data.asset);
    return result;
  }

  async function handleRemoveCompanyBrandAsset(values: {
    expectedRevisionNo: number;
    requestKey: string;
  }) {
    if (!persistence?.removeCompanyBrandAsset || !companyBrandAsset.canManage) {
      return { errors: ["Firma logosu kaldırma yetkisi bulunamadı."], ok: false as const };
    }
    const result = await persistence.removeCompanyBrandAsset(values);
    if (result.ok) setCompanyBrandAsset(result.data.asset);
    return result;
  }

  async function handleSaveCompanyLocation(values: CompanyLocationSaveInput) {
    if (!persistence?.saveCompanyLocation || context.userRole !== "admin") {
      return false;
    }
    const result = await persistence.saveCompanyLocation(values);
    if (!result.ok) {
      setNotice(result.errors.join(" "));
      return false;
    }
    setCompanyLocations((current) => {
      const index = current.findIndex(
        (row) => row.id === result.data.location.id,
      );
      if (index < 0) {
        return [...current, result.data.location].sort((left, right) =>
          left.code.localeCompare(right.code, "tr"),
        );
      }
      return current.map((row, rowIndex) =>
        rowIndex === index ? result.data.location : row,
      );
    });
    setNotice(
      result.data.idempotent
        ? "Lokasyon daha önce kaydedilmiş işlemden okundu."
        : "Şirket lokasyonu kaydedildi.",
    );
    return true;
  }

  async function handlePrepareInvite() {
    const selectedRole = inviteRole || settingsContract.userTypeRows[0]?.type || "";
    const result = await persistence?.createInvitation?.({
      accessProfileId:
        selectedRole === CUSTOM_RBAC_USER_TYPE
          ? inviteAccessProfileId
          : undefined,
      email: inviteEmail.trim(),
      role: selectedRole,
    });

    if (result?.ok) {
      setNotice(
        `Davet kaydı oluşturuldu: ${result.data.invitation.email} · ${result.data.invitation.role}. Link ${formatDateFromIso(result.data.invitation.expiresAt)} tarihine kadar geçerli.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      `Davet taslağı hazırlandı: ${inviteEmail.trim()} · ${selectedRole}. Mail gönderimi sonraki server action diliminde açılacaktır.`,
    );
  }

  async function handleDeactivateUser(accessId: string) {
    const result = await persistence?.deactivateUser?.(accessId);

    if (result?.ok) {
      const { deactivatedAccess } = result.data;

      setOverview((current) => removeActiveUserFromOverview(current, accessId));
      setNotice(
        `Kullanıcı devre dışı bırakıldı: ${deactivatedAccess.userName} / ${deactivatedAccess.email ?? "-"}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Kullanıcı devre dışı bırakma kalıcı action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleUpdateUserRole(accessId: string, role: "admin" | "accounting" | "viewer") {
    const result = await persistence?.updateUserRole?.(accessId, role);
    if (result?.ok) {
      setOverview((current) => ({ ...current, activeUsers: current.activeUsers.map((user) => user.id === accessId ? { ...user, role: result.data.updatedAccess.role } : user) }));
      setNotice(`Kullanıcı rolü güncellendi: ${result.data.updatedAccess.userName} · ${result.data.updatedAccess.role}.`);
    } else if (result && !result.ok) setNotice(result.errors.join(" "));
  }

  async function handleRevokeInvitation(invitationId: string) {
    const result = await persistence?.revokeInvitation?.(invitationId);

    if (result?.ok) {
      const { invitation } = result.data;

      setOverview((current) =>
        updateInvitationInOverview(current, invitation.id, {
          status: invitation.status,
          statusLabel: formatInvitationStatusLabel(invitation.status),
        }),
      );
      setNotice(`Davet iptal edildi: ${invitation.email}.`);

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Davet iptali kalıcı action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleResendInvitation(invitationId: string) {
    const result = await persistence?.resendInvitation?.(invitationId);

    if (result?.ok) {
      const { invitation } = result.data;

      setOverview((current) =>
        updateInvitationInOverview(current, invitation.id, {
          expiresAt: invitation.expiresAt,
          status: invitation.status,
          statusLabel: formatInvitationStatusLabel(invitation.status),
        }),
      );
      setNotice(
        `Davet yeniden gönderildi: ${invitation.email}. Link ${formatDateFromIso(invitation.expiresAt)} tarihine kadar geçerli.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Davet yeniden gönderme kalıcı action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleTestBankConnection() {
    const values = {
      bankCode,
      consentId: bankConsentId.trim(),
    };
    const result = await persistence?.testBankConnection?.(values);

    if (result?.ok) {
      const connection = toBankConnectionView(result.data.connection);

      setBankIntegration((current) => upsertBankConnection(current, connection));
      setNotice(
        `Banka sandbox bağlantısı doğrulandı: ${connection.bankName} / ${connection.consentId}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    const bankName =
      bankIntegration.supportedBanks.find((bank) => bank.bankCode === bankCode)
        ?.bankName ?? bankCode;

    setNotice(
      `Banka sandbox bağlantısı taslağı hazırlandı: ${bankName} / ${values.consentId}. Kalıcı test action bağlantısı sonraki dilimde açılacaktır.`,
    );
  }

  async function handleTestArventoConnection() {
    const credentialDraft = validateArventoCredentialDraft({
      pin1: arventoPin1,
      pin2: arventoPin2,
      userName: arventoUserName,
    });

    if (!credentialDraft.ok) {
      setNotice(credentialDraft.errors.join(" "));
      return;
    }

    const result = await persistence?.testArventoConnection?.();

    if (result?.ok) {
      setNotice(
        `Arvento sandbox bağlantısı doğrulandı: ${result.data.connection.endpoint} / ${result.data.connection.refreshIntervalLabel}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Arvento bağlantı testi P2-S3 sandbox action diliminde açılacaktır.",
    );
  }

  async function handleSyncBankTransactions(connectionId: string) {
    const dateRange = normalizeBankSyncDateRange({
      dateFrom: bankSyncDateFrom,
      dateTo: bankSyncDateTo,
    });
    const dateRangeError = validateBankSyncDateRange(dateRange);

    if (dateRangeError) {
      setNotice(dateRangeError);

      return;
    }

    const hasDateRange = Boolean(dateRange.dateFrom || dateRange.dateTo);
    const result = hasDateRange
      ? await persistence?.syncBankTransactions?.(connectionId, dateRange)
      : await persistence?.syncBankTransactions?.(connectionId);

    if (result?.ok) {
      const recentTransactions = result.data.transactions.map(toBankTransactionView);

      setBankIntegration((current) =>
        upsertBankTransactions(current, recentTransactions),
      );
      const preservedStatusMessage =
        result.data.preservedStatusCount > 0
          ? `, ${result.data.preservedStatusCount} durum korundu`
          : "";
      const dateRangeMessage = formatBankSyncDateRangeNotice(dateRange);
      setNotice(
        `Banka hareketleri senkronize edildi: ${result.data.syncedCount} hareket${preservedStatusMessage}${dateRangeMessage}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(
        `Banka hareketleri senkronize edilemedi: ${result.errors.join(" ")}`,
      );

      return;
    }

    setNotice(
      "Banka hareketi senkronizasyon action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleApproveBankMatch(values: {
    cashBankMovementId: string;
    transactionId: string;
  }) {
    const result = await persistence?.approveBankMatch?.(values);

    if (result?.ok) {
      const transaction = toBankTransactionView(result.data.transaction);

      setBankIntegration((current) =>
        removeBankMatchSuggestion(
          upsertBankTransactions(current, [transaction]),
          values,
        ),
      );
      setNotice(
        `Banka hareketi eşleştirildi: ${result.data.cashBankMovement.documentNo} / ${result.data.cashBankMovement.sourceLabel || "-"}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Banka eşleşme onayı kalıcı action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleIgnoreBankTransaction(transactionId: string) {
    const result = await persistence?.ignoreBankTransaction?.(transactionId);

    if (result?.ok) {
      const transaction = toBankTransactionView(result.data.transaction);

      setBankIntegration((current) =>
        upsertBankTransactions(current, [transaction]),
      );
      setNotice(`Banka hareketi yoksayıldı: ${transaction.description}.`);

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Banka hareketi yoksayma action bağlantısı sonraki dilimde açılacaktır.",
    );
  }
  async function handleReopenIgnoredBankTransaction(transactionId: string) {
    const result = await persistence?.reopenIgnoredBankTransaction?.(transactionId);

    if (result?.ok) {
      const transaction = toBankTransactionView(result.data.transaction);

      setBankIntegration((current) =>
        upsertBankTransactions(current, [transaction]),
      );
      setNotice(`Banka hareketi tekrar beklemeye alındı: ${transaction.description}.`);

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Banka hareketi yoksayma geri alma action bağlantısı sonraki dilimde açılacaktır.",
    );
  }
  async function handleReopenBankMatch(transactionId: string) {
    const result = await persistence?.reopenBankMatch?.(transactionId);

    if (result?.ok) {
      const transaction = toBankTransactionView(result.data.transaction);

      setBankIntegration((current) =>
        upsertBankTransactions(current, [transaction]),
      );
      setNotice(`Banka eşleşmesi geri alındı: ${transaction.description}.`);

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Banka eşleşmesi geri alma action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleApproveManualBankMatch(values: {
    cashBankMovementId: string;
    transactionId: string;
  }) {
    const result = await persistence?.approveManualBankMatch?.(values);

    if (result?.ok) {
      const transaction = toBankTransactionView(result.data.transaction);

      setBankIntegration((current) =>
        upsertBankTransactions(current, [transaction]),
      );
      setNotice(
        `Banka hareketi manuel eşleştirildi: ${result.data.cashBankMovement.documentNo} / ${result.data.cashBankMovement.sourceLabel || "-"}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Banka manuel eşleştirme action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleCreateCashBankMovementFromBankTransaction(
    transactionId: string,
    account?: CashBankAccountOption,
  ) {
    const result =
      await persistence?.createCashBankMovementFromBankTransaction?.(
        transactionId,
        account,
      );

    if (result?.ok) {
      const transaction = toBankTransactionView(result.data.transaction);

      setBankIntegration((current) =>
        upsertBankTransactions(current, [transaction]),
      );
      setNotice(
        `Kasa/banka kaydı oluşturuldu: ${result.data.cashBankMovement.documentNo} / ${transaction.description}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Banka hareketinden kasa/banka kaydı oluşturma action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  async function handleCreatePartialCashBankMovementFromBankTransaction(
    transactionId: string,
    cashBankMovementId: string,
    account?: CashBankAccountOption,
  ) {
    const result =
      await persistence?.createPartialCashBankMovementFromBankTransaction?.(
        transactionId,
        cashBankMovementId,
        account,
      );

    if (result?.ok) {
      const transaction = toBankTransactionView(result.data.transaction);

      setBankIntegration((current) =>
        removeManualMatchCandidateFromOverview(
          upsertBankTransactions(current, [transaction]),
          cashBankMovementId,
        ),
      );
      setNotice(
        `Parçalı kasa/banka kaydı oluşturuldu: ${result.data.cashBankMovement.documentNo} / ${transaction.description}.`,
      );

      return;
    }

    if (result && !result.ok) {
      setNotice(result.errors.join(" "));

      return;
    }

    setNotice(
      "Parçalı banka hareketinden kasa/banka kaydı oluşturma action bağlantısı sonraki dilimde açılacaktır.",
    );
  }

  return (
    <section
      className="mx-auto flex max-w-[1440px] flex-col gap-4"
      data-settings-workspace="true"
    >
      <header className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            Sistem · Yönetim merkezi
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Ayarlar
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
                Firma bağlamı, finans politikaları, kullanıcı yetkileri,
                denetim kapsamı ve sandbox bağlantıları tek yönetim çalışma
                alanında izlenir.
              </p>
            </div>
            <span className="rounded-ui-control border border-brand-primary/20 bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary">
              Aktif Rol: {context.userRole}
            </span>
          </div>
          <nav aria-label="Ayarlar çalışma alanı bölümleri" className="mt-5 flex flex-wrap gap-2">
            <a className="rounded-ui-control bg-brand-primary px-3 py-2 text-xs font-semibold text-on-brand" href="#settings-general">
              Firma ve Finans
            </a>
            <a className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content" href="#settings-access">
              Kullanıcı ve Yetki
            </a>
            <a className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content" href="#settings-integrations">
              Sandbox Bağlantıları
            </a>
            <a className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content" href="#settings-audit">
              Denetim
            </a>
          </nav>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-ui-panel border border-divider bg-surface-raised p-2 shadow-sm" aria-label="Ayarlar hızlı işlemleri">
        {settingsContract.actionRows.map((action) => (
          <button
            className="rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:bg-brand-primary-subtle"
            key={action.label}
            onClick={() => setNotice(action.message)}
            type="button"
          >
            {action.label}
          </button>
        ))}
        <button
          className="rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:bg-brand-primary-subtle"
          onClick={handlePrint}
          type="button"
        >
          {settingsContract.printAction.label}
        </button>
      </div>

      {notice ? (
        <div
          className="rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm font-semibold text-content-subtle"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4">
          <div className="grid scroll-mt-20 gap-4" id="settings-general">
            <ContextPanel context={context} rows={settingsContract.companyDisplayRows} />
            <CompanyProfilePanel
              isSaving={isSavingCompanyProfile}
              key={`${companyProfile.source}:${companyProfile.revisionNo}:${companyProfile.updatedAt ?? companyProfile.legalName}`}
              onSave={handleSaveCompanyProfile}
              profile={companyProfile}
            />
            <CompanyBrandAssetPanel
              asset={companyBrandAsset}
              onRemove={handleRemoveCompanyBrandAsset}
              onUpload={handleUploadCompanyBrandAsset}
            />
            <CompanyLocationDirectoryPanel
              canManage={context.userRole === "admin"}
              locations={companyLocations}
              onSave={handleSaveCompanyLocation}
            />
            <SupplierCategoryPanel
              canManage={context.userRole === "admin"}
              categories={supplierCategories}
              onChangeStatus={persistence?.changeSupplierCategoryStatus}
              onSave={persistence?.saveSupplierCategory}
            />
            <CustomerTypePanel
              canManage={context.userRole === "admin"}
              customerTypes={customerTypes}
              onChangeStatus={persistence?.changeCustomerTypeStatus}
              onSave={persistence?.saveCustomerType}
            />
            {accessProfileOverview ? (
              <AccessProfilePanel
                activeUsers={overview.activeUsers}
                onAssign={persistence?.assignAccessProfile}
                onChangeStatus={persistence?.changeAccessProfileStatus}
                onSave={persistence?.saveAccessProfile}
                overview={accessProfileOverview}
              />
            ) : null}
            <FinancePanel
              isSaving={isSavingFinanceSettings}
              onSave={handleSaveFinanceSettings}
              policyRows={financePolicyRows}
              rows={financeDisplayRows}
              settings={financeSettings}
            />
          </div>
          <div className="grid scroll-mt-20 gap-4" id="settings-integrations">
            <ArventoFleetPanel
              access={arventoFleetFeatureAccess}
              pin1={arventoPin1}
              pin2={arventoPin2}
              onTestConnection={() => void handleTestArventoConnection()}
              onPin1Change={setArventoPin1}
              onPin2Change={setArventoPin2}
              onUserNameChange={setArventoUserName}
              overview={arventoFleetOverview}
              readiness={arventoCredentialReadiness}
              userName={arventoUserName}
            />
            <BankIntegrationPanel
            access={bankIntegrationFeatureAccess}
            consentId={bankConsentId}
            overview={bankIntegration}
            selectedBankCode={bankCode}
            syncDateFrom={bankSyncDateFrom}
            syncDateTo={bankSyncDateTo}
            onConsentIdChange={setBankConsentId}
            onSelectedBankCodeChange={setBankCode}
            onSyncDateFromChange={setBankSyncDateFrom}
            onSyncDateToChange={setBankSyncDateTo}
            onApproveMatch={(values) => void handleApproveBankMatch(values)}
            onCreateCashBankMovementFromBankTransaction={(transactionId) =>
              void handleCreateCashBankMovementFromBankTransaction(
                transactionId,
                resolveSelectedCashBankAccountOption({
                  accountCodeByTransaction: cashBankAccountCodeByTransaction,
                  accountOptions: bankCashBankAccountOptions,
                  overview: bankIntegration,
                  transactionId,
                }),
              )
            }
            onCreatePartialCashBankMovementFromBankTransaction={(
              transactionId,
              cashBankMovementId,
            ) => {
              const selectionKey = buildPartialCashBankAccountSelectionKey({
                cashBankMovementId,
                transactionId,
              });

              void handleCreatePartialCashBankMovementFromBankTransaction(
                transactionId,
                cashBankMovementId,
                resolveSelectedCashBankAccountOption({
                  accountCodeByTransaction: cashBankAccountCodeByTransaction,
                  accountOptions: bankCashBankAccountOptions,
                  overview: bankIntegration,
                  selectionKey,
                  transactionId,
                }),
              );
            }}
            onCashBankAccountSelectionChange={(transactionId, accountCode) =>
              setCashBankAccountCodeByTransaction((current) => ({
                ...current,
                [transactionId]: accountCode,
              }))
            }
            onApproveManualMatch={(values) =>
              void handleApproveManualBankMatch(values)
            }
            onIgnoreTransaction={(transactionId) =>
              void handleIgnoreBankTransaction(transactionId)
            }
            onManualMatchSelectionChange={(transactionId, cashBankMovementId) =>
              setManualMatchSelectionByTransaction((current) => ({
                ...current,
                [transactionId]: cashBankMovementId,
              }))
            }
            onReopenIgnoredTransaction={(transactionId) =>
              void handleReopenIgnoredBankTransaction(transactionId)
            }
            onReopenMatch={(transactionId) =>
              void handleReopenBankMatch(transactionId)
            }
            onSyncTransactions={(connectionId) =>
              void handleSyncBankTransactions(connectionId)
            }
            onTestConnection={() => void handleTestBankConnection()}
            cashBankAccountCodeByTransaction={cashBankAccountCodeByTransaction}
            cashBankAccountOptions={bankCashBankAccountOptions}
              manualMatchSelectionByTransaction={manualMatchSelectionByTransaction}
            />
          </div>
          <div className="min-w-0 scroll-mt-20" id="settings-ledger">
            <LedgerSurface
              canPost={context.userRole === "admin" || context.userRole === "accounting"}
              canClosePeriod={context.userRole === "admin"}
              entries={ledgerEntries}
              auditEntries={ledgerAuditEntries}
              periodClosed={ledgerPeriodClosed}
              onClosePeriod={() => persistence?.closeLedgerPeriod?.() ?? Promise.resolve({ ok: false as const, errors: ["Dönem action bağlantısı bulunamadı."] })}
              onReopenPeriod={() => persistence?.reopenLedgerPeriod?.() ?? Promise.resolve({ ok: false as const, errors: ["Dönem action bağlantısı bulunamadı."] })}
              onPost={(draft) => persistence?.postLedgerJournal?.(draft) ?? Promise.resolve({ ok: false as const, errors: ["Ledger action bağlantısı bulunamadı."] })}
            />
          </div>
          <div className="grid scroll-mt-20 gap-4" id="settings-access">
            <RbacPermissionPanel currentRole={context.userRole} />
            <RoleMatrix
              permissionRows={settingsContract.rolePermissionRows}
              rows={settingsContract.roleRows}
            />
            <UserManagementPanel
            accessProfiles={
              accessProfileOverview?.profiles.filter(
                (profile) => profile.status === "ACTIVE",
              ) ?? []
            }
            currentUserId={context.userId}
            inviteAccessProfileId={inviteAccessProfileId}
            inviteEmail={inviteEmail}
            invitePolicy={settingsContract.userInvitePolicy}
            inviteRole={inviteRole || settingsContract.userTypeRows[0]?.type || ""}
            isInvitePanelOpen={isInvitePanelOpen}
            onInviteAccessProfileChange={setInviteAccessProfileId}
            onInviteEmailChange={setInviteEmail}
            onInviteRoleChange={(value) => {
              setInviteRole(value);
              if (value !== CUSTOM_RBAC_USER_TYPE) setInviteAccessProfileId("");
            }}
            onDeactivateUser={(accessId) => void handleDeactivateUser(accessId)}
            onUpdateUserRole={(accessId, role) => void handleUpdateUserRole(accessId, role)}
            onOpenInvitePanel={() => {
              setInviteRole(settingsContract.userTypeRows[0]?.type || "");
              setInviteAccessProfileId("");
              setIsInvitePanelOpen(true);
            }}
            onPrepareInvite={() => void handlePrepareInvite()}
            onRevokeInvitation={(invitationId) =>
              void handleRevokeInvitation(invitationId)
            }
            onResendInvitation={(invitationId) =>
              void handleResendInvitation(invitationId)
            }
              overview={overview}
              userTypeRows={settingsContract.userTypeRows}
            />
          </div>
        </div>
        <div className="scroll-mt-20 xl:sticky xl:top-20 xl:self-start" id="settings-audit">
          <AuditScopePanel auditScopes={settingsContract.auditScopes} />
        </div>
      </div>
    </section>
  );
}

function ContextPanel({
  context,
  rows: companyRows,
}: SettingsSurfaceProps & { rows: { label: string; value: string }[] }) {
  const rows = [
    { label: "Tenant", value: context.tenantName },
    { label: "Firma", value: context.companyName },
    { label: "Dönem", value: context.periodLabel },
    { label: "Kullanıcı", value: context.userName },
    { label: "Lisans", value: context.licenseLabel },
    ...companyRows,
  ];

  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Firma Bilgileri</h2>
      </div>
      <dl className="grid gap-0 divide-y divide-divider">
        {rows.map((row) => (
          <div
            className="grid min-h-[var(--ds-data-row-height)] grid-cols-[180px_1fr] items-center gap-3 px-4 py-2 text-sm"
            key={row.label}
          >
            <dt className="text-content-subtle">{row.label}</dt>
            <dd className="font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function CompanyProfilePanel({
  isSaving,
  onSave,
  profile,
}: {
  isSaving: boolean;
  onSave: (values: CompanyProfileSaveInput) => Promise<void>;
  profile: EffectiveCompanyProfile;
}) {
  const [draft, setDraft] = useState<CompanyProfileValues>(() =>
    profileValues(profile),
  );

  function update(field: keyof CompanyProfileValues, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({
      ...draft,
      expectedRevisionNo: profile.revisionNo,
      requestKey: `company-profile-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    });
  }

  const disabled = !profile.canManage || isSaving;

  return (
    <section
      aria-label="Kalıcı firma profili"
      className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
    >
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Hukuki ve İletişim Profili</h2>
        <p className="mt-1 text-xs text-content-subtle">
          Belge başlıklarında kullanılır; AppShell firma etiketi ve lokasyon
          modu değişmez.
        </p>
      </div>
      <form
        className="grid gap-4 p-4 sm:grid-cols-2"
        onSubmit={submit}
      >
        <ProfileField label="Hukuki unvan" wide>
          <input
            className={profileControlClass}
            disabled={disabled}
            maxLength={200}
            onChange={(event) => update("legalName", event.target.value)}
            required
            value={draft.legalName}
          />
        </ProfileField>
        <ProfileField label="Vergi dairesi">
          <input
            className={profileControlClass}
            disabled={disabled}
            maxLength={100}
            onChange={(event) => update("taxOffice", event.target.value)}
            value={draft.taxOffice}
          />
        </ProfileField>
        <ProfileField label="Vergi numarası">
          <input
            className={profileControlClass}
            disabled={disabled}
            inputMode="numeric"
            maxLength={11}
            onChange={(event) => update("taxNumber", event.target.value)}
            value={draft.taxNumber}
          />
        </ProfileField>
        <ProfileField label="MERSİS numarası">
          <input
            className={profileControlClass}
            disabled={disabled}
            inputMode="numeric"
            maxLength={16}
            onChange={(event) => update("mersisNumber", event.target.value)}
            value={draft.mersisNumber}
          />
        </ProfileField>
        <ProfileField label="Telefon">
          <input
            className={profileControlClass}
            disabled={disabled}
            maxLength={30}
            onChange={(event) => update("phone", event.target.value)}
            type="tel"
            value={draft.phone}
          />
        </ProfileField>
        <ProfileField label="Firma e-postası">
          <input
            className={profileControlClass}
            disabled={disabled}
            maxLength={254}
            onChange={(event) => update("email", event.target.value)}
            type="email"
            value={draft.email}
          />
        </ProfileField>
        <ProfileField label="Adres" wide>
          <textarea
            className={`${profileControlClass} min-h-20 py-2`}
            disabled={disabled}
            maxLength={300}
            onChange={(event) => update("addressLine", event.target.value)}
            value={draft.addressLine}
          />
        </ProfileField>
        <ProfileField label="İlçe">
          <input
            className={profileControlClass}
            disabled={disabled}
            maxLength={100}
            onChange={(event) => update("district", event.target.value)}
            value={draft.district}
          />
        </ProfileField>
        <ProfileField label="İl">
          <input
            className={profileControlClass}
            disabled={disabled}
            maxLength={100}
            onChange={(event) => update("city", event.target.value)}
            value={draft.city}
          />
        </ProfileField>
        <ProfileField label="Posta kodu">
          <input
            className={profileControlClass}
            disabled={disabled}
            maxLength={10}
            onChange={(event) => update("postalCode", event.target.value)}
            value={draft.postalCode}
          />
        </ProfileField>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-semibold text-on-brand disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            type="submit"
          >
            {isSaving ? "Kaydediliyor…" : "Firma profilini kaydet"}
          </button>
          <span className="text-xs text-content-muted">
            {profile.source === "persisted"
              ? `Kalıcı kayıt · Revizyon ${profile.revisionNo}`
              : "Company.name fallback · henüz kalıcı profil yok"}
          </span>
          {!profile.canManage ? (
            <span className="text-xs font-semibold text-warning">
              Bu kapsamda salt okunur.
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function ProfileField({
  children,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <label
      className={`grid gap-1 text-sm font-semibold text-content ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      {label}
      {children}
    </label>
  );
}

function profileValues(profile: EffectiveCompanyProfile): CompanyProfileValues {
  return {
    addressLine: profile.addressLine,
    city: profile.city,
    district: profile.district,
    email: profile.email,
    legalName: profile.legalName,
    mersisNumber: profile.mersisNumber,
    phone: profile.phone,
    postalCode: profile.postalCode,
    taxNumber: profile.taxNumber,
    taxOffice: profile.taxOffice,
  };
}

const profileControlClass =
  "min-h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";

function FinancePanel({
  isSaving,
  onSave,
  policyRows,
  rows,
  settings,
}: {
  isSaving: boolean;
  onSave: (values: FinanceSettingsSaveInput) => Promise<void>;
  policyRows: SettingsFinancePolicyRow[];
  rows: { label: string; value: string }[];
  settings: EffectiveFinanceSettings;
}) {
  const [defaultVatRate, setDefaultVatRate] = useState(
    String(settings.defaultVatRate),
  );
  const [showVatBreakdown, setShowVatBreakdown] = useState(
    settings.showVatBreakdown,
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({
      defaultVatRate: Number(defaultVatRate),
      expectedRevisionNo: settings.revisionNo,
      requestKey: `finance-settings-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      showVatBreakdown,
    });
  }

  return (
    <section
      aria-label="Finans Ayarları"
      className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
    >
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Finans Ayarları</h2>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((item) => (
          <article
            className="rounded-ui-control border border-divider bg-surface-muted p-3"
            key={item.label}
          >
            <p className="text-xs font-semibold text-content-subtle">
              {item.label}
            </p>
            <p className="mt-2 font-mono text-lg font-semibold">{item.value}</p>
          </article>
        ))}
      </div>
      <form
        aria-label="Kalıcı finans ayarları"
        className="grid gap-4 border-t border-divider bg-surface-subtle p-4 sm:grid-cols-2"
        onSubmit={submit}
      >
        <label className="grid gap-1 text-sm font-semibold text-content">
          Varsayılan KDV oranı (%)
          <input
            className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-mono disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!settings.canManage || isSaving}
            max="100"
            min="0"
            onChange={(event) => setDefaultVatRate(event.target.value)}
            step="0.01"
            type="number"
            value={defaultVatRate}
          />
        </label>
        <label className="flex items-center gap-3 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content">
          <input
            checked={showVatBreakdown}
            disabled={!settings.canManage || isSaving}
            onChange={(event) => setShowVatBreakdown(event.target.checked)}
            type="checkbox"
          />
          KDV toplam kırılımını göster
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-semibold text-on-brand disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!settings.canManage || isSaving}
            type="submit"
          >
            {isSaving ? "Kaydediliyor…" : "Finans ayarlarını kaydet"}
          </button>
          <span className="text-xs text-content-muted">
            {settings.source === "persisted"
              ? `Kalıcı kayıt · Revizyon ${settings.revisionNo}`
              : "Varsayılan sözleşme · henüz kalıcı kayıt yok"}
          </span>
          {!settings.canManage ? (
            <span className="text-xs font-semibold text-warning">
              Bu kapsamda salt okunur.
            </span>
          ) : null}
        </div>
      </form>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">KDV ve Döviz Davranışı</h3>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P0 Finans KDV Detayları"
          className="min-w-[760px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Ayar</th>
              <th className="px-4 py-3 font-semibold">Alan</th>
              <th className="px-4 py-3 font-semibold">Değer</th>
              <th className="px-4 py-3 font-semibold">P0 Davranışı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {policyRows.map((row) => (
              <tr key={row.field}>
                <td className="px-4 py-3 font-semibold">{row.setting}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.field}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  {row.value}
                </td>
                <td className="px-4 py-3">{row.p0Behavior}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ArventoFleetPanel({
  access,
  onTestConnection,
  onPin1Change,
  onPin2Change,
  onUserNameChange,
  overview,
  pin1,
  pin2,
  readiness,
  userName,
}: {
  access?: SubscriptionFeatureAccessRow;
  onTestConnection: () => void;
  onPin1Change: (value: string) => void;
  onPin2Change: (value: string) => void;
  onUserNameChange: (value: string) => void;
  overview: ArventoFleetOverview;
  pin1: string;
  pin2: string;
  readiness: ReturnType<typeof getArventoCredentialReadiness>;
  userName: string;
}) {
  if (access && !access.enabled) {
    return (
      <section
        aria-label="Arvento Filo Takip"
        className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
      >
        <div className="border-b border-divider px-4 py-3">
          <h2 className="text-sm font-semibold">Arvento Filo Takip</h2>
          <p className="mt-1 text-xs font-semibold text-content-subtle">
            GPS, CANbus/OBD ve araç puantaj hazırlığı
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold">Kurumsal paket gerekli</p>
            <p className="mt-1 text-sm text-content-subtle">
              {access.label} için {access.reason}
            </p>
          </div>
          <span className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle">
            {access.requiredPlan}
          </span>
        </div>
      </section>
    );
  }

  const { connection } = overview;

  return (
    <section
      aria-label="Arvento Filo Takip"
      className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
    >
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Arvento Filo Takip</h2>
        <p className="mt-1 text-xs font-semibold text-content-subtle">
          GPS, CANbus/OBD ve araç puantaj hazırlığı
        </p>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-3">
          <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-ui-control border border-divider bg-surface-muted p-3">
              <dt className="text-xs font-semibold text-content-subtle">
                Durum
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {connection.statusLabel}
              </dd>
            </div>
            <div className="rounded-ui-control border border-divider bg-surface-muted p-3">
              <dt className="text-xs font-semibold text-content-subtle">
                Endpoint
              </dt>
              <dd className="mt-1 font-mono text-sm font-semibold">
                {connection.endpoint}
              </dd>
            </div>
            <div className="rounded-ui-control border border-divider bg-surface-muted p-3">
              <dt className="text-xs font-semibold text-content-subtle">
                Yenileme
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {connection.refreshIntervalLabel}
              </dd>
            </div>
            <div className="rounded-ui-control border border-divider bg-surface-muted p-3">
              <dt className="text-xs font-semibold text-content-subtle">
                Kullanıcı
              </dt>
              <dd className="mt-1 font-mono text-sm font-semibold">
                {connection.userName}
              </dd>
            </div>
          </dl>

          <div className="overflow-x-auto">
            <table
              aria-label="P2 Arvento Entegrasyon Özellikleri"
              className="min-w-[760px] w-full text-left text-sm"
            >
              <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
                <tr>
                  <th className="px-4 py-3">Özellik</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {overview.capabilities.map((capability) => (
                  <tr key={capability.label}>
                    <td className="px-4 py-3 font-semibold">
                      {capability.label}
                    </td>
                    <td className="px-4 py-3">{capability.description}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold">
                        {capability.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-ui-panel border border-divider bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase text-content-subtle">
            Bağlantı
          </p>
          <p className="mt-2 text-sm font-semibold">
            {connection.simulationMode ? "Simülasyon Modu" : "Canlı Mod"}
          </p>
          <p className="mt-2 text-sm leading-6 text-content-subtle">
            Arvento web servis kimlik bilgileri bu başlangıç diliminde ekrana
            veya kalıcı kaynağa yazılmaz.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Arvento Kullanıcı Adı
              <input
                className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-mono text-sm text-content"
                onChange={(event) => onUserNameChange(event.target.value)}
                value={userName}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              PIN1
              <input
                autoComplete="off"
                className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-mono text-sm text-content"
                onChange={(event) => onPin1Change(event.target.value)}
                type="password"
                value={pin1}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              PIN2
              <input
                autoComplete="off"
                className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-mono text-sm text-content"
                onChange={(event) => onPin2Change(event.target.value)}
                type="password"
                value={pin2}
              />
            </label>
          </div>
          <div className="mt-3 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-subtle">
            <span>{readiness.statusLabel}</span>
            {readiness.ready ? null : (
              <span className="block font-normal">
                Eksik alanlar: {readiness.missingFields.join(", ")}
              </span>
            )}
          </div>
          <button
            className="mt-4 w-full rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:opacity-90"
            onClick={onTestConnection}
            type="button"
          >
            Arvento Bağlantısını Test Et
          </button>
        </aside>
      </div>
    </section>
  );
}

function BankIntegrationPanel({
  access,
  cashBankAccountCodeByTransaction,
  cashBankAccountOptions,
  consentId,
  manualMatchSelectionByTransaction,
  onConsentIdChange,
  onApproveManualMatch,
  onApproveMatch,
  onCashBankAccountSelectionChange,
  onCreateCashBankMovementFromBankTransaction,
  onCreatePartialCashBankMovementFromBankTransaction,
  onIgnoreTransaction,
  onManualMatchSelectionChange,
  onReopenIgnoredTransaction,
  onReopenMatch,
  onSelectedBankCodeChange,
  onSyncDateFromChange,
  onSyncDateToChange,
  onSyncTransactions,
  onTestConnection,
  overview,
  selectedBankCode,
  syncDateFrom,
  syncDateTo,
}: {
  access?: SubscriptionFeatureAccessRow;
  cashBankAccountCodeByTransaction: Record<string, string>;
  cashBankAccountOptions: CashBankAccountOption[];
  consentId: string;
  manualMatchSelectionByTransaction: Record<string, string>;
  onConsentIdChange: (value: string) => void;
  onApproveManualMatch: (values: {
    cashBankMovementId: string;
    transactionId: string;
  }) => void;
  onApproveMatch: (values: {
    cashBankMovementId: string;
    transactionId: string;
  }) => void;
  onCashBankAccountSelectionChange: (
    transactionId: string,
    accountCode: string,
  ) => void;
  onCreateCashBankMovementFromBankTransaction: (transactionId: string) => void;
  onCreatePartialCashBankMovementFromBankTransaction: (
    transactionId: string,
    cashBankMovementId: string,
  ) => void;
  onIgnoreTransaction: (transactionId: string) => void;
  onManualMatchSelectionChange: (
    transactionId: string,
    cashBankMovementId: string,
  ) => void;
  onReopenIgnoredTransaction: (transactionId: string) => void;
  onReopenMatch: (transactionId: string) => void;
  onSelectedBankCodeChange: (value: string) => void;
  onSyncDateFromChange: (value: string) => void;
  onSyncDateToChange: (value: string) => void;
  onSyncTransactions: (connectionId: string) => void;
  onTestConnection: () => void;
  overview: BankIntegrationOverview;
  selectedBankCode: string;
  syncDateFrom: string;
  syncDateTo: string;
}) {
  const [pendingPartialApproval, setPendingPartialApproval] = useState<{
    bankTransactionDescription: string;
    bankTransactionId: string;
    cashBankMovementDocumentNo: string;
    cashBankMovementId: string;
    remainingAmount: number;
  }>();
  const [bankTransactionStatusFilter, setBankTransactionStatusFilter] =
    useState<BankTransactionStatusFilter>("all");
  const [bankLedgerStatusFilter, setBankLedgerStatusFilter] =
    useState<BankLedgerStatusFilter>("all");
  const [bankLedgerAccountFilter, setBankLedgerAccountFilter] =
    useState("all");
  const [bankLedgerRecoveryFilter, setBankLedgerRecoveryFilter] =
    useState<BankLedgerRecoveryFilter>("all");
  const [bankLedgerRecoveryFlowFilter, setBankLedgerRecoveryFlowFilter] =
    useState<BankLedgerRecoveryFlowFilter>("all");
  const [bankLedgerReconciliationIssueFilter, setBankLedgerReconciliationIssueFilter] =
    useState<BankLedgerReconciliationIssueFilter>("all");
  useEffect(() => {
    if (!pendingPartialApproval) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingPartialApproval(undefined);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingPartialApproval]);
  const filteredRecentBankTransactions = overview.recentTransactions.filter(
    (transaction) => {
      if (bankTransactionStatusFilter === "all") return true;
      if (bankTransactionStatusFilter === "partial") {
        if (transaction.status !== "matched") return false;
        return (overview.manualMatchCandidates ?? []).some(
          (candidate) =>
            isPartialCashBankMovementForTransaction(candidate, transaction.id),
        );
      }
      return transaction.status === bankTransactionStatusFilter;
    },
  );

  if (access && !access.enabled) {
    return (
      <section
        aria-label="Banka Entegrasyonu"
        className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
      >
        <div className="border-b border-divider px-4 py-3">
          <h2 className="text-sm font-semibold">Banka Entegrasyonu</h2>
          <p className="mt-1 text-xs font-semibold text-content-subtle">
            Open Banking sandbox
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold">Kurumsal paket gerekli</p>
            <p className="mt-1 text-sm text-content-subtle">
              {access.label} için {access.reason}
            </p>
          </div>
          <span className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle">
            {access.requiredPlan}
          </span>
        </div>
      </section>
    );
  }

  const cashBankMovementDrafts = buildBankTransactionCashBankMovementDrafts({
    transactions: overview.recentTransactions,
  });
  const partialReconciliationDrafts = buildBankTransactionPartialReconciliationDrafts({
    candidates: overview.manualMatchCandidates ?? [],
    transactions: overview.recentTransactions,
  });
  const partialCashBankMovementDrafts =
    buildBankTransactionPartialCashBankMovementDrafts({
      candidates: overview.manualMatchCandidates ?? [],
      transactions: overview.recentTransactions,
    });
  const bankSyncDateRangeNotice = formatBankSyncDateRangeNotice({
    dateFrom: syncDateFrom,
    dateTo: syncDateTo,
  });
  const pendingTransactionCount = overview.recentTransactions.filter(
    (transaction) => transaction.status === "pending",
  ).length;
  const matchedTransactionCount = overview.recentTransactions.filter(
    (transaction) => transaction.status === "matched",
  ).length;
  const ignoredTransactionCount = overview.recentTransactions.filter(
    (transaction) => transaction.status === "ignored",
  ).length;
  const ledgerEntries = overview.ledgerEntries ?? [];
  const ledgerAccountFilterOptions = summarizeActiveBankLedgerByAccount(
    ledgerEntries,
  );
  const filteredLedgerEntries = ledgerEntries.filter(
    (entry) => {
      const matchesStatus =
        bankLedgerStatusFilter === "all" ||
        entry.status === bankLedgerStatusFilter;
      const accountKey = `${entry.cashBankAccountCode}::${entry.cashBankAccountName}`;
      const matchesAccount =
        bankLedgerAccountFilter === "all" ||
        accountKey === bankLedgerAccountFilter;
      return matchesStatus && matchesAccount;
    },
  );
  const activeLedgerEntryCount = ledgerEntries.filter(
    (entry) => entry.status === "active",
  ).length;
  const voidedLedgerEntryCount = ledgerEntries.filter(
    (entry) => entry.status === "voided",
  ).length;
  const activeLedgerEntries = ledgerEntries.filter(
    (entry) => entry.status === "active",
  );
  const activeLedgerDebitTotal = activeLedgerEntries
    .filter((entry) => entry.ledgerDirection === "debit")
    .reduce((total, entry) => total + entry.amount, 0);
  const activeLedgerCreditTotal = activeLedgerEntries
    .filter((entry) => entry.ledgerDirection === "credit")
    .reduce((total, entry) => total + entry.amount, 0);
  const ledgerAccountSummaries = summarizeActiveBankLedgerByAccount(ledgerEntries);
  const ledgerReconciliationIssues = buildBankLedgerReconciliationIssues(
    overview.recentTransactions,
    ledgerEntries,
  );
  const filteredLedgerReconciliationIssues = ledgerReconciliationIssues.filter(
    (issue) =>
      bankLedgerReconciliationIssueFilter === "all" ||
      issue.issueType === bankLedgerReconciliationIssueFilter,
  );
  const ledgerFailureAudits = overview.ledgerFailureAudits ?? [];
  const filteredLedgerFailureAudits = ledgerFailureAudits.filter((audit) => {
    const matchesRecoveryStatus =
      bankLedgerRecoveryFilter === "all" ||
      (bankLedgerRecoveryFilter === "recovered"
        ? audit.recovered
        : !audit.recovered);
    const matchesFlow =
      bankLedgerRecoveryFlowFilter === "all" ||
      audit.failureTypeLabel === bankLedgerRecoveryFlowFilter;
    return matchesRecoveryStatus && matchesFlow;
  });
  const reconciledTransactionCount = Math.max(
    overview.recentTransactions.length -
      new Set(
        ledgerReconciliationIssues
          .filter((issue) => issue.expectedAmount !== undefined)
          .map((issue) => issue.bankTransactionId),
      ).size,
    0,
  );
  const completedPartialMovementCount = (overview.manualMatchCandidates ?? []).filter(
    (candidate) => candidate.sourceType === "bank-transaction-partial",
  ).length;
  const availableBankCount = overview.supportedBanks.filter(
    (bank) => bank.status === "Mevcut",
  ).length;
  const upcomingBankCount = overview.supportedBanks.filter(
    (bank) => bank.status === "Yakında",
  ).length;
  const connectedBankCount = overview.connections.filter(
    (connection) => connection.status === "connected",
  ).length;
  const failedBankCount = overview.connections.filter(
    (connection) => connection.status === "failed",
  ).length;
  return (
    <section
      aria-label="Banka Entegrasyonu"
      className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
    >
      {pendingPartialApproval ? (
        <div className="border-b border-divider bg-surface-muted p-4" role="dialog" aria-label="Parçalı mutabakat onayı">
          <p className="text-sm font-semibold">Parçalı mutabakat onayı</p>
          <p className="mt-1 text-sm text-content-subtle">
            {pendingPartialApproval.bankTransactionDescription} hareketi için {pendingPartialApproval.cashBankMovementDocumentNo} belgesinden kalan {formatCurrency(pendingPartialApproval.remainingAmount, "TRY")} tutarında fark kaydı oluşturulacak.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold" onClick={() => setPendingPartialApproval(undefined)} type="button">Vazgeç</button>
            <button className="rounded-ui-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-on-brand" onClick={() => { onCreatePartialCashBankMovementFromBankTransaction(pendingPartialApproval.bankTransactionId, pendingPartialApproval.cashBankMovementId); setPendingPartialApproval(undefined); }} type="button">Kısmi Mutabakatı Onayla</button>
          </div>
        </div>
      ) : null}
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Banka Entegrasyonu</h2>
        <p className="mt-1 text-xs font-semibold text-content-subtle">
          Open Banking sandbox
        </p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-[220px_1fr_auto] md:items-end">
        <label className="grid gap-1 text-sm font-medium">
          Banka
          <select
            className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
            onChange={(event) => onSelectedBankCodeChange(event.target.value)}
            value={selectedBankCode}
          >
            {overview.supportedBanks.map((bank) => (
              <option
                disabled={bank.status !== "Mevcut"}
                key={bank.bankCode}
                value={bank.bankCode}
              >
                {bank.bankName} · {bank.status}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Rıza Numarası
          <input
            className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
            onChange={(event) => onConsentIdChange(event.target.value)}
            placeholder="NOA-SANDBOX-001"
            value={consentId}
          />
        </label>
        <button
          className="rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:opacity-90"
          onClick={onTestConnection}
          type="button"
        >
          Sandbox Bağlantıyı Test Et
        </button>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Desteklenen Bankalar</h3>
        <p className="mt-1 text-xs font-semibold text-content-subtle">
          Kullanılabilir: {availableBankCount} · Yakında: {upcomingBankCount}
        </p>
      </div>
      <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.supportedBanks.map((bank) => (
          <article
            className="rounded-ui-control border border-divider bg-surface-muted p-3"
            key={bank.bankCode}
          >
            <p className="text-sm font-semibold">{bank.bankName}</p>
            <p className="mt-1 text-xs font-semibold text-content-subtle">
              {bank.status}
            </p>
          </article>
        ))}
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Sandbox Bağlantıları</h3>
        <p className="mt-1 text-xs font-semibold text-content-subtle">
          Bağlı: {connectedBankCount} · Hatalı: {failedBankCount}
        </p>
      </div>
      <div className="grid gap-3 px-4 pb-4 md:grid-cols-[220px_220px_1fr] md:items-end">
        <label className="grid gap-1 text-sm font-medium">
          Başlangıç Tarihi
          <input
            className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
            onChange={(event) => onSyncDateFromChange(event.target.value)}
            type="date"
            value={syncDateFrom}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Bitiş Tarihi
          <input
            className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
            onChange={(event) => onSyncDateToChange(event.target.value)}
            type="date"
            value={syncDateTo}
          />
        </label>
        {bankSyncDateRangeNotice ? (
          <p className="text-xs font-semibold text-content-subtle md:col-span-3">
            Senkronizasyon filtresi{bankSyncDateRangeNotice}.
          </p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Banka Sandbox Bağlantıları"
          className="min-w-[860px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Banka</th>
              <th className="px-4 py-3 font-semibold">Ortam</th>
              <th className="px-4 py-3 font-semibold">Rıza No</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">Son Test</th>
              <th className="px-4 py-3 font-semibold">Mesaj</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {overview.connections.length ? (
              overview.connections.map((connection) => (
                <tr key={connection.id}>
                  <td className="px-4 py-3 font-semibold">
                    {connection.bankName}
                  </td>
                  <td className="px-4 py-3">{connection.environmentLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {connection.consentId}
                  </td>
                  <td className="px-4 py-3">{connection.statusLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(connection.lastTestedAt)}
                  </td>
                  <td className="px-4 py-3">{connection.lastTestMessage}</td>
                  <td className="px-4 py-3">
                    <button
                      aria-label={`Hareketleri Senkronize Et ${connection.bankName}`}
                      className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                      onClick={() => onSyncTransactions(connection.id)}
                      type="button"
                    >
                      Senkronize Et
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={7}>
                  <p>Henüz sandbox banka bağlantısı yok.</p>
                  <p className="mt-1 text-xs">
                    İlk bağlantıyı oluşturmak için yukarıdan kullanılabilir bir banka ve rıza numarası seçip bağlantıyı test edin.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Son Banka Hareketleri</h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Durum filtresi
        </span>
        {bankTransactionStatusFilters.map((filter) => (
          <button
            aria-pressed={bankTransactionStatusFilter === filter}
            className={`h-8 rounded-ui-control border px-3 text-xs font-semibold transition ${
              bankTransactionStatusFilter === filter
                ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                : "border-divider bg-surface-muted text-content-subtle hover:bg-brand-primary-subtle"
            }`}
            key={filter}
            onClick={() =>
              setBankTransactionStatusFilter((currentFilter) =>
                currentFilter === filter ? "all" : filter,
              )
            }
            type="button"
          >
            {bankTransactionStatusFilterLabels[filter]}
          </button>
        ))}
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs font-semibold text-content-subtle">
          {overview.recentTransactions.length} kayıt içinden{" "}
          {filteredRecentBankTransactions.length} gösteriliyor.
        </p>
        <p className="mt-1 text-xs text-content-subtle">
          Bekliyor: {pendingTransactionCount} · Eşleştirildi: {matchedTransactionCount} · Yoksayıldı: {ignoredTransactionCount} · Parçalı kaydedildi: {completedPartialMovementCount}
        </p>
        <p className="mt-1 text-xs text-content-subtle">
          Ledger izi: {ledgerEntries.length} · Aktif: {activeLedgerEntryCount} · İptal: {voidedLedgerEntryCount}
        </p>
        <p className="mt-1 text-xs text-content-subtle">
          Aktif ledger toplamı: Borç {formatCurrency(activeLedgerDebitTotal, "TRY")} · Alacak {formatCurrency(activeLedgerCreditTotal, "TRY")}
        </p>
        {ledgerAccountSummaries.length ? (
          <p className="mt-1 text-xs text-content-subtle">
            Hesap dağılımı: {ledgerAccountSummaries.map((summary) => `${summary.accountCode} ${summary.accountName} · ${formatCurrency(summary.debitTotal + summary.creditTotal, summary.currency)}`).join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Son Banka Hareketleri"
          className="min-w-[880px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">Banka</th>
              <th className="px-4 py-3 font-semibold">Açıklama</th>
              <th className="px-4 py-3 font-semibold">Yön</th>
              <th className="px-4 py-3 font-semibold">Tutar</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredRecentBankTransactions.length ? (
              filteredRecentBankTransactions.map((transaction) => {
                const manualCandidates =
              transaction.status === "pending"
                    ? filterManualMatchCandidatesForTransaction(
                        overview.manualMatchCandidates ?? [],
                        transaction,
                      )
                    : [];
                const manualMatchCandidateSummary =
                  summarizeManualMatchCandidatesForTransaction(manualCandidates);
                const selectedManualMatchId =
                  manualMatchSelectionByTransaction[transaction.id] ||
                  manualCandidates[0]?.cashBankMovementId ||
                  "";
                const selectedManualMatch = manualCandidates.find(
                  (candidate) =>
                    candidate.cashBankMovementId === selectedManualMatchId,
                );
                const canApproveSelectedManualMatch =
                  selectedManualMatch?.canApprove ?? false;

                return (
                <tr key={transaction.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(transaction.occurredAt)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {transaction.bankName}
                  </td>
                  <td className="px-4 py-3">{transaction.description}</td>
                  <td className="px-4 py-3">
                    {transaction.direction === "inflow" ? "Giriş" : "Çıkış"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="px-4 py-3">{transaction.statusLabel}</td>
                  <td className="px-4 py-3">
                    {transaction.status === "matched" ? (
                      <button
                        aria-label={`Eşleşmeyi Geri Al ${transaction.description}`}
                        className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                        onClick={() => onReopenMatch(transaction.id)}
                        type="button"
                      >
                        Geri Al
                      </button>
                    ) : transaction.status === "ignored" ? (
                      <button
                        aria-label={`Yoksaymayı Geri Al ${transaction.description}`}
                        className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                        onClick={() => onReopenIgnoredTransaction(transaction.id)}
                        type="button"
                      >
                        Geri Al
                      </button>
                    ) : transaction.status === "pending" ? (
                      <div className="grid min-w-[260px] gap-2">
                        {manualCandidates.length ? (
                          <>
                            <p className="text-xs font-semibold text-content-subtle">
                              {manualMatchCandidateSummary}
                            </p>
                            <label className="grid gap-1 text-xs font-semibold text-content-subtle">
                              <span>Manuel Eşleştirme</span>
                              <select
                                aria-label={`Manuel eşleşme seçimi ${transaction.description}`}
                                className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1 text-xs text-content"
                                onChange={(event) =>
                                  onManualMatchSelectionChange(
                                    transaction.id,
                                    event.target.value,
                                  )
                                }
                                value={selectedManualMatchId}
                              >
                                {manualCandidates.map((candidate) => (
                                  <option
                                    key={candidate.cashBankMovementId}
                                    value={candidate.cashBankMovementId}
                                  >
                                    {formatManualMatchCandidateOption(
                                      candidate,
                                      transaction,
                                    )}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {selectedManualMatch && !canApproveSelectedManualMatch ? (
                              <p className="text-xs font-semibold text-content-subtle">
                                Kısmi mutabakat taslağı: fark {formatCurrency(
                                  selectedManualMatch.differenceAmount,
                                  transaction.currency,
                                )}. Onay sonraki dilimde açılacaktır.
                              </p>
                            ) : null}
                            <button
                              aria-label={`Manuel Eşleştir ${transaction.description}`}
                              className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={!canApproveSelectedManualMatch}
                              onClick={() =>
                                onApproveManualMatch({
                                  cashBankMovementId: selectedManualMatchId,
                                  transactionId: transaction.id,
                                })
                              }
                              type="button"
                            >
                              Manuel Eşleştir
                            </button>
                          </>
                        ) : null}
                        <button
                          aria-label={`Banka Hareketini Yoksay ${transaction.description}`}
                          className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                          onClick={() => onIgnoreTransaction(transaction.id)}
                          type="button"
                        >
                          Yoksay
                        </button>
                      </div>
                    ) : (
                      <span className="text-content-subtle">-</span>
                    )}
                  </td>
                </tr>
                );
              })
            ) : overview.recentTransactions.length ? (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={7}>
                  Seçili filtreye uyan banka hareketi yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={7}>
                  Henüz senkronize edilmiş banka hareketi yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Ledger Kontrol Merkezi</h3>
        <p className="mt-1 text-xs text-content-subtle">
          Banka hareketlerinden oluşan son muhasebe izleri; yalnız okunabilir operasyon görünümüdür.
        </p>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Ledger Mutabakat Kontrolü</h3>
        <p className="mt-1 text-xs text-content-subtle">
          Banka hareketi durumu, aktif ledger izlerinin toplam tutarı ve muhasebe yönü birlikte kontrol edilir.
        </p>
        <p className="mt-2 text-xs font-semibold text-content-subtle">
          Kontrol edilen: {overview.recentTransactions.length} · Tutarlı: {reconciledTransactionCount} · Sorun: {ledgerReconciliationIssues.length}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Mutabakat sorun filtresi
        </span>
        <div
          aria-label="Ledger mutabakat sorun filtresi"
          className="flex flex-wrap items-center gap-2"
          role="group"
        >
          {bankLedgerReconciliationIssueFilters.map((filter) => (
            <button
              aria-pressed={bankLedgerReconciliationIssueFilter === filter}
              className={`h-8 rounded-ui-control border px-3 text-xs font-semibold transition ${
                bankLedgerReconciliationIssueFilter === filter
                  ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                  : "border-divider bg-surface-muted text-content-subtle hover:bg-brand-primary-subtle"
              }`}
              key={filter}
              onClick={() => setBankLedgerReconciliationIssueFilter(filter)}
              type="button"
            >
              {filter === "all"
                ? "Tümü"
                : getBankLedgerReconciliationIssueLabel(filter)}
            </button>
          ))}
          <span className="text-xs text-content-subtle">
            {filteredLedgerReconciliationIssues.length} / {ledgerReconciliationIssues.length} sorun gösteriliyor.
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Banka Ledger Mutabakat Sorunları"
          className="min-w-[880px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Banka Hareketi</th>
              <th className="px-4 py-3 font-semibold">Beklenen Tutar</th>
              <th className="px-4 py-3 font-semibold">Aktif Ledger</th>
              <th className="px-4 py-3 font-semibold">Kontrol Sonucu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredLedgerReconciliationIssues.length ? (
              filteredLedgerReconciliationIssues.map((issue) => (
                <tr key={`${issue.bankTransactionId}::${issue.issueType}`}>
                  <td className="px-4 py-3">
                    <span className="font-semibold">
                      {issue.bankTransactionDescription}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-content-subtle">
                      {issue.bankTransactionId}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {issue.expectedAmount === undefined
                      ? "-"
                      : formatCurrency(issue.expectedAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(issue.activeLedgerAmount, "TRY")} · {issue.activeLedgerEntryCount} iz
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--ds-danger)]">
                    {issue.statusLabel}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={4}>
                  {ledgerReconciliationIssues.length
                    ? "Seçili mutabakat filtresine uyan sorun yok."
                    : "Banka hareketleri ile aktif ledger izleri tutarlı."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Ledger Recovery İzleri</h3>
        <p className="mt-1 text-xs text-content-subtle">
          Son retryable ledger hataları ve işlem durumunun telafi edilip edilmediği.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Recovery durum filtresi
        </span>
        <div
          aria-label="Ledger recovery durumu filtresi"
          className="flex flex-wrap items-center gap-2"
          role="group"
        >
          {([
            ["all", "Tümü"],
            ["retryable", "Tekrar denenebilir"],
            ["recovered", "Geri alındı"],
          ] as const).map(([filter, label]) => (
            <button
              aria-pressed={bankLedgerRecoveryFilter === filter}
              className={`h-8 rounded-ui-control border px-3 text-xs font-semibold transition ${
                bankLedgerRecoveryFilter === filter
                  ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                  : "border-divider bg-surface-muted text-content-subtle hover:bg-brand-primary-subtle"
              }`}
              key={filter}
              onClick={() => setBankLedgerRecoveryFilter(filter)}
              type="button"
            >
              {label}
            </button>
          ))}
          <span className="text-xs text-content-subtle">
            {filteredLedgerFailureAudits.length} / {ledgerFailureAudits.length} gösteriliyor.
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Recovery akış filtresi
        </span>
        <div
          aria-label="Ledger recovery akış filtresi"
          className="flex flex-wrap items-center gap-2"
          role="group"
        >
          {([
            ["all", "Tümü"],
            ["Eşleştirme", "Eşleştirme"],
            ["Yeni kasa/banka", "Yeni kasa/banka"],
            ["Parçalı kasa/banka", "Parçalı kasa/banka"],
          ] as const).map(([filter, label]) => (
            <button
              aria-pressed={bankLedgerRecoveryFlowFilter === filter}
              className={`h-8 rounded-ui-control border px-3 text-xs font-semibold transition ${
                bankLedgerRecoveryFlowFilter === filter
                  ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                  : "border-divider bg-surface-muted text-content-subtle hover:bg-brand-primary-subtle"
              }`}
              key={filter}
              onClick={() => setBankLedgerRecoveryFlowFilter(filter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Ledger Recovery İzleri"
          className="min-w-[880px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">Akış</th>
              <th className="px-4 py-3 font-semibold">Banka Hareketi</th>
              <th className="px-4 py-3 font-semibold">Kasa/Banka</th>
              <th className="px-4 py-3 font-semibold">Durum geçişi</th>
              <th className="px-4 py-3 font-semibold">Sonuç</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredLedgerFailureAudits.length ? (
              filteredLedgerFailureAudits.map((audit) => (
                <tr key={`${audit.occurredAt}::${audit.bankTransactionId}::${audit.action}`}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(audit.occurredAt)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {audit.failureTypeLabel}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{audit.entityLabel}</span>
                    <span className="mt-0.5 block font-mono text-xs text-content-subtle">
                      {audit.bankTransactionId}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {audit.cashBankMovementId}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {audit.statusTransitionLabel ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {audit.recovered ? "Hareket geri alındı" : "Tekrar denenebilir"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={6}>
                  {ledgerFailureAudits.length
                    ? "Seçili recovery filtresine uyan kayıt yok."
                    : "Retryable ledger hata izi yok."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
          Ledger durum filtresi
        </span>
        {([ 
          ["all", "Tümü"],
          ["active", "Aktif"],
          ["voided", "İptal"],
        ] as const).map(([filter, label]) => (
          <button
            aria-pressed={bankLedgerStatusFilter === filter}
            className={`h-8 rounded-ui-control border px-3 text-xs font-semibold transition ${
              bankLedgerStatusFilter === filter
                ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                : "border-divider bg-surface-muted text-content-subtle hover:bg-brand-primary-subtle"
            }`}
            key={filter}
            onClick={() => setBankLedgerStatusFilter(filter)}
            type="button"
          >
            {label}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-xs font-semibold text-content-subtle">
          Hesap
          <select
            aria-label="Ledger hesap filtresi"
            className="h-8 rounded-ui-control border border-divider bg-surface-muted px-2 text-xs font-normal"
            onChange={(event) => setBankLedgerAccountFilter(event.target.value)}
            value={bankLedgerAccountFilter}
          >
            <option value="all">Tüm hesaplar</option>
            {ledgerAccountFilterOptions.map((account) => (
              <option
                key={`${account.accountCode}::${account.accountName}`}
                value={`${account.accountCode}::${account.accountName}`}
              >
                {account.accountCode} · {account.accountName}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-content-subtle">
          {filteredLedgerEntries.length} / {ledgerEntries.length} gösteriliyor.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Son Banka Ledger İzleri"
          className="min-w-[980px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">Belge</th>
              <th className="px-4 py-3 font-semibold">Açıklama</th>
              <th className="px-4 py-3 font-semibold">Hesap</th>
              <th className="px-4 py-3 font-semibold">Tutar</th>
              <th className="px-4 py-3 font-semibold">Yön</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredLedgerEntries.length ? (
              filteredLedgerEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(entry.entryDate)}
                  </td>
                  <td className="px-4 py-3 font-semibold">{entry.documentNo}</td>
                  <td className="px-4 py-3">{entry.description}</td>
                  <td className="px-4 py-3">
                    {entry.cashBankAccountCode} · {entry.cashBankAccountName}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(entry.amount, entry.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {entry.ledgerDirection === "debit" ? "Borç" : "Alacak"}
                  </td>
                  <td className="px-4 py-3">
                    {entry.status === "active" ? "Aktif" : "İptal"}
                  </td>
                </tr>
              ))
            ) : ledgerEntries.length ? (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={7}>
                  Seçili ledger filtrelerine uyan kayıt yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={7}>
                  Henüz banka ledger izi yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Yeni Kasa/Banka Hareket Taslakları</h3>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Yeni Kasa/Banka Hareket Taslakları"
          className="min-w-[980px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Banka Açıklaması</th>
              <th className="px-4 py-3 font-semibold">Hareket Tipi</th>
              <th className="px-4 py-3 font-semibold">Yön</th>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">Tutar</th>
              <th className="px-4 py-3 font-semibold">Taslak Açıklama</th>
              <th className="px-4 py-3 font-semibold">Hesap</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {cashBankMovementDrafts.length ? (
              cashBankMovementDrafts.map((draft) => {
                const selectedAccount = resolveSelectedCashBankAccountOption({
                  accountCodeByTransaction: cashBankAccountCodeByTransaction,
                  accountOptions: cashBankAccountOptions,
                  overview,
                  transactionId: draft.bankTransactionId,
                });

                return (
                <tr key={draft.bankTransactionId}>
                  <td className="px-4 py-3">{draft.bankTransactionDescription}</td>
                  <td className="px-4 py-3">{draft.movementType}</td>
                  <td className="px-4 py-3">{draft.directionLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(draft.movementDate)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(draft.amount, "TRY")}
                  </td>
                  <td className="px-4 py-3">{draft.suggestedDescription}</td>
                  <td className="px-4 py-3">
                    {cashBankAccountOptions.length ? (
                      <label className="grid gap-1 text-xs font-semibold text-content-subtle">
                        <span>Hesap</span>
                        <select
                          aria-label={`Kasa/banka hesabı seçimi ${draft.bankTransactionDescription}`}
                          className="min-w-[190px] rounded-ui-control border border-divider bg-surface-raised px-2 py-1 text-xs text-content"
                          onChange={(event) =>
                            onCashBankAccountSelectionChange(
                              draft.bankTransactionId,
                              event.target.value,
                            )
                          }
                          value={
                            cashBankAccountCodeByTransaction[
                              draft.bankTransactionId
                            ] ||
                            selectedAccount?.code ||
                            ""
                          }
                        >
                          {cashBankAccountOptions.map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} · {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className="text-content-subtle">
                        Varsayılan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{draft.statusLabel}</td>
                  <td className="px-4 py-3">
                    <button
                      aria-label={`Kasa/Banka Kaydı Oluştur ${draft.bankTransactionDescription}`}
                      className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                      onClick={() =>
                        onCreateCashBankMovementFromBankTransaction(
                          draft.bankTransactionId,
                        )
                      }
                      type="button"
                    >
                      Kayda Çevir
                    </button>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={9}>
                  Yeni kasa/banka hareket taslağı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Kısmi Mutabakat Taslakları</h3>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Kısmi Mutabakat Taslakları"
          className="min-w-[980px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Banka Açıklaması</th>
              <th className="px-4 py-3 font-semibold">Banka Tutarı</th>
              <th className="px-4 py-3 font-semibold">Kasa/Banka Belgesi</th>
              <th className="px-4 py-3 font-semibold">Kaynak Kayıt</th>
              <th className="px-4 py-3 font-semibold">Kasa/Banka Tutarı</th>
              <th className="px-4 py-3 font-semibold">Fark</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {partialReconciliationDrafts.length ? (
              partialReconciliationDrafts.map((draft) => (
                <tr
                  key={`${draft.bankTransactionId}-${draft.cashBankMovementId}`}
                >
                  <td className="px-4 py-3">{draft.bankTransactionDescription}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(draft.bankTransactionAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {draft.cashBankMovementDocumentNo}
                  </td>
                  <td className="px-4 py-3">{draft.cashBankMovementLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(draft.cashBankMovementAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(draft.differenceAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3">{draft.statusLabel}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={7}>
                  Henüz kısmi mutabakat taslağı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Parçalı Yeni Kayıt Taslakları</h3>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Parçalı Yeni Kasa/Banka Kayıt Taslakları"
          className="min-w-[1040px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Banka Açıklaması</th>
              <th className="px-4 py-3 font-semibold">Banka Tutarı</th>
              <th className="px-4 py-3 font-semibold">Mevcut Belge</th>
              <th className="px-4 py-3 font-semibold">Kaynak Kayıt</th>
              <th className="px-4 py-3 font-semibold">Mevcut Tutar</th>
              <th className="px-4 py-3 font-semibold">Yeni Kayıt Tutarı</th>
              <th className="px-4 py-3 font-semibold">Taslak Açıklama</th>
              <th className="px-4 py-3 font-semibold">Hesap</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {partialCashBankMovementDrafts.length ? (
              partialCashBankMovementDrafts.map((draft) => {
                const selectionKey = buildPartialCashBankAccountSelectionKey({
                  cashBankMovementId: draft.cashBankMovementId,
                  transactionId: draft.bankTransactionId,
                });
                const selectedAccount = resolveSelectedCashBankAccountOption({
                  accountCodeByTransaction: cashBankAccountCodeByTransaction,
                  accountOptions: cashBankAccountOptions,
                  overview,
                  selectionKey,
                  transactionId: draft.bankTransactionId,
                });

                return (
                <tr
                  key={`${draft.bankTransactionId}-${draft.cashBankMovementId}`}
                >
                  <td className="px-4 py-3">{draft.bankTransactionDescription}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(draft.bankTransactionAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {draft.cashBankMovementDocumentNo}
                  </td>
                  <td className="px-4 py-3">{draft.cashBankMovementLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(draft.cashBankMovementAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(draft.remainingAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3">{draft.suggestedDescription}</td>
                  <td className="px-4 py-3">
                    {cashBankAccountOptions.length ? (
                      <label className="grid gap-1 text-xs font-semibold text-content-subtle">
                        <span>Hesap</span>
                        <select
                          aria-label={`Parçalı kasa/banka hesabı seçimi ${draft.bankTransactionDescription}`}
                          className="min-w-[190px] rounded-ui-control border border-divider bg-surface-raised px-2 py-1 text-xs text-content"
                          onChange={(event) =>
                            onCashBankAccountSelectionChange(
                              selectionKey,
                              event.target.value,
                            )
                          }
                          value={
                            cashBankAccountCodeByTransaction[selectionKey] ||
                            selectedAccount?.code ||
                            ""
                          }
                        >
                          {cashBankAccountOptions.map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} · {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className="text-content-subtle">
                        Varsayılan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{draft.statusLabel}</td>
                  <td className="px-4 py-3">
                    <button
                      aria-label={`Parçalı Kasa/Banka Kaydı Oluştur ${draft.bankTransactionDescription} ${draft.cashBankMovementDocumentNo}`}
                      className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                      onClick={() => setPendingPartialApproval({
                        bankTransactionDescription: draft.bankTransactionDescription,
                        bankTransactionId: draft.bankTransactionId,
                        cashBankMovementDocumentNo: draft.cashBankMovementDocumentNo,
                        cashBankMovementId: draft.cashBankMovementId,
                        remainingAmount: draft.remainingAmount,
                      })}
                      type="button"
                    >
                      Kayda Çevir
                    </button>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={10}>
                  Parçalı yeni kayıt taslağı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Otomatik Eşleşme Önerileri</h3>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P2 Otomatik Eşleşme Önerileri"
          className="min-w-[920px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Banka Açıklaması</th>
              <th className="px-4 py-3 font-semibold">Kasa/Banka Belgesi</th>
              <th className="px-4 py-3 font-semibold">Kaynak Kayıt</th>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">Tutar</th>
              <th className="px-4 py-3 font-semibold">Skor</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {overview.matchSuggestions.length ? (
              overview.matchSuggestions.map((suggestion) => (
                <tr
                  key={`${suggestion.bankTransactionId}-${suggestion.cashBankMovementId}`}
                >
                  <td className="px-4 py-3">
                    {suggestion.bankTransactionDescription}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {suggestion.cashBankMovementDocumentNo}
                  </td>
                  <td className="px-4 py-3">{suggestion.cashBankMovementLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(suggestion.matchedDate)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {formatCurrency(suggestion.matchedAmount, "TRY")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    %{suggestion.score}
                  </td>
                  <td className="px-4 py-3">{suggestion.statusLabel}</td>
                  <td className="px-4 py-3">
                    <button
                      aria-label={`Eşleşmeyi Onayla ${suggestion.cashBankMovementDocumentNo}`}
                      className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                      onClick={() =>
                        onApproveMatch({
                          cashBankMovementId: suggestion.cashBankMovementId,
                          transactionId: suggestion.bankTransactionId,
                        })
                      }
                      type="button"
                    >
                      Onayla
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={8}>
                  Henüz otomatik eşleşme önerisi yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoleMatrix({
  permissionRows,
  rows,
}: {
  permissionRows: {
    canCreate: boolean;
    canDelete: boolean;
    canUpdate: boolean;
    canView: boolean;
    resource: string;
    role: string;
    specialActions: string;
  }[];
  rows: { permissions: string; role: string; scope: string }[];
}) {
  return (
    <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">Rol Yönetimi</h2>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P0 Rol Yetki Matrisi"
          className="min-w-[720px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Kapsam</th>
              <th className="px-4 py-3 font-semibold">Yetki</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {rows.map((row) => (
              <tr key={row.role}>
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  {row.role}
                </td>
                <td className="px-4 py-3">{row.scope}</td>
                <td className="px-4 py-3">{row.permissions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Kaynak-Aksiyon Matrisi</h3>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P0 Kaynak-Aksiyon Matrisi"
          className="min-w-[880px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Kaynak</th>
              <th className="px-4 py-3 text-center font-semibold">Oluştur</th>
              <th className="px-4 py-3 text-center font-semibold">Sil</th>
              <th className="px-4 py-3 text-center font-semibold">Düzenle</th>
              <th className="px-4 py-3 text-center font-semibold">Görüntüle</th>
              <th className="px-4 py-3 font-semibold">Özel Aksiyonlar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {permissionRows.map((row) => (
              <tr key={`${row.role}-${row.resource}`}>
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  {row.role}
                </td>
                <td className="px-4 py-3">{row.resource}</td>
                <td className="px-4 py-3 text-center">{formatPermission(row.canCreate)}</td>
                <td className="px-4 py-3 text-center">{formatPermission(row.canDelete)}</td>
                <td className="px-4 py-3 text-center">{formatPermission(row.canUpdate)}</td>
                <td className="px-4 py-3 text-center">{formatPermission(row.canView)}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.specialActions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function formatPermission(value: boolean) {
  return value ? "Evet" : "Hayır";
}

function formatDateFromIso(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(value));
}

function RbacPermissionPanel({ currentRole }: { currentRole: TenantScope["userRole"] }) {
  const rows: Array<{ label: string; permission: RbacPermission }> = [
    { label: "Kasa/banka mutasyonu", permission: "cash-bank.manage" },
    { label: "Döküman mutasyonu", permission: "document.manage" },
    { label: "Ledger fişi post", permission: "ledger.post" },
    { label: "Kullanıcı yönetimi", permission: "user.manage" },
  ];
  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-4">
      <h3 className="text-sm font-semibold">RBAC işlem sınırları</h3>
      <p className="mt-1 text-xs text-content-subtle">Mevcut rolün hangi kalıcı mutasyonları çalıştırabildiği.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => {
          const allowedRoles = getRbacPermissionRoles(row.permission);
          const allowed = allowedRoles.includes(currentRole);
          return <div className="flex items-center justify-between rounded border border-divider px-3 py-2 text-xs" key={row.permission}><span>{row.label}</span><span className={allowed ? "font-semibold text-success" : "text-content-subtle"}>{allowed ? "İzinli" : "Salt okunur"} · {allowedRoles.join(", ")}</span></div>;
        })}
      </div>
    </article>
  );
}

function UserManagementPanel({
  accessProfiles,
  currentUserId,
  inviteAccessProfileId,
  inviteEmail,
  invitePolicy,
  inviteRole,
  isInvitePanelOpen,
  onInviteEmailChange,
  onInviteAccessProfileChange,
  onInviteRoleChange,
  onDeactivateUser,
  onUpdateUserRole,
  onOpenInvitePanel,
  onPrepareInvite,
  onRevokeInvitation,
  onResendInvitation,
  overview,
  userTypeRows,
}: {
  accessProfiles: AccessProfileOverview["profiles"];
  currentUserId: string;
  inviteAccessProfileId: string;
  inviteEmail: string;
  invitePolicy: SettingsUserInvitePolicy;
  inviteRole: string;
  isInvitePanelOpen: boolean;
  onInviteAccessProfileChange: (value: string) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onDeactivateUser: (accessId: string) => void;
  onUpdateUserRole: (accessId: string, role: "admin" | "accounting" | "viewer") => void;
  onOpenInvitePanel: () => void;
  onPrepareInvite: () => void;
  onRevokeInvitation: (invitationId: string) => void;
  onResendInvitation: (invitationId: string) => void;
  overview: UserManagementOverview;
  userTypeRows: SettingsUserTypeRow[];
}) {
  const emailOutboxMessages = overview.emailOutboxMessages ?? [];
  const [activeUserSearch, setActiveUserSearch] = useState("");
  const activeUserSearchTerm = activeUserSearch.trim().toLocaleLowerCase("tr-TR");
  const filteredActiveUsers = overview.activeUsers.filter((user) =>
    [user.fullName, user.email, user.role, user.companyName, user.statusLabel]
      .join(" ")
      .toLocaleLowerCase("tr-TR")
      .includes(activeUserSearchTerm),
  );
  const [invitationSearch, setInvitationSearch] = useState("");
  const [invitationStatusFilter, setInvitationStatusFilter] = useState("all");
  const invitationSearchTerm = invitationSearch.trim().toLocaleLowerCase("tr-TR");
  const filteredInvitations = overview.invitations.filter((invitation) =>
    [invitation.email, invitation.role, invitation.statusLabel]
      .join(" ")
      .toLocaleLowerCase("tr-TR")
      .includes(invitationSearchTerm) &&
    (invitationStatusFilter === "all" || invitation.status === invitationStatusFilter),
  );
  const [emailOutboxSearch, setEmailOutboxSearch] = useState("");
  const emailOutboxSearchTerm = emailOutboxSearch.trim().toLocaleLowerCase("tr-TR");
  const filteredEmailOutboxMessages = emailOutboxMessages.filter((message) =>
    [message.recipientEmail, message.template, message.subject, message.status, message.statusLabel]
      .join(" ")
      .toLocaleLowerCase("tr-TR")
      .includes(emailOutboxSearchTerm),
  );
  const pendingEmailCount = emailOutboxMessages.filter(
    (message) => message.status === "pending",
  ).length;
  const sentEmailCount = emailOutboxMessages.filter(
    (message) => message.status === "sent",
  ).length;
  const failedEmailCount = emailOutboxMessages.filter(
    (message) => message.status === "failed",
  ).length;
  const activeUserRoleCounts = Array.from(
    overview.activeUsers.reduce((counts, user) => {
      counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  ).sort(([left], [right]) => left.localeCompare(right, "tr"));
  const expiredInvitationCount = overview.invitations.filter(
    (invitation) => invitation.status === "expired",
  ).length;
  const revokedInvitationCount = overview.invitations.filter(
    (invitation) => invitation.status === "revoked",
  ).length;
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const auditSearchTerm = auditSearch.trim().toLocaleLowerCase("tr-TR");
  const auditActionOptions = Array.from(
    new Set(overview.auditLogs.map((auditLog) => auditLog.action)),
  ).sort((left, right) => left.localeCompare(right, "tr"));
  const filteredAuditLogs = overview.auditLogs.filter((auditLog) => {
    const haystack = [
      auditLog.action,
      auditLog.entityLabel,
      auditLog.detail,
    ]
      .join(" ")
      .toLocaleLowerCase("tr-TR");
    return (
      (!auditSearchTerm || haystack.includes(auditSearchTerm)) &&
      (auditActionFilter === "all" || auditLog.action === auditActionFilter) &&
      (!auditDateFrom || auditLog.occurredAt.slice(0, 10) >= auditDateFrom) &&
      (!auditDateTo || auditLog.occurredAt.slice(0, 10) <= auditDateTo)
    );
  });

  return (
    <section
      aria-label="Kullanıcı Yönetimi"
      className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
    >
      <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Kullanıcı Yönetimi</h2>
          <p className="mt-1 text-xs text-content-subtle">
            P1 kullanıcı tipi ve davet kapsamı
          </p>
        </div>
        <button
          className="rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-1.5 text-sm font-semibold text-on-brand transition hover:opacity-90"
          onClick={onOpenInvitePanel}
          type="button"
        >
          {invitePolicy.buttonLabel}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P1 Kullanıcı Tipleri"
          className="min-w-[760px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Tip</th>
              <th className="px-4 py-3 font-semibold">Açıklama</th>
              <th className="px-4 py-3 font-semibold">Yetki Seviyesi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {userTypeRows.map((row) => (
              <tr key={row.type}>
                <td className="px-4 py-3 font-semibold">{row.type}</td>
                <td className="px-4 py-3">{row.description}</td>
                <td className="px-4 py-3">{row.permissionLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider bg-surface-muted px-4 py-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-content-subtle">
          <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
            Aktif kullanıcı: {overview.summary.activeUserCount}
          </span>
          <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
            Bekleyen davet: {overview.summary.pendingInvitationCount}
          </span>
          <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
            Kabul edilen davet: {overview.summary.acceptedInvitationCount}
          </span>
          <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
            Süresi dolmuş davet: {expiredInvitationCount}
          </span>
          <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
            İptal edilmiş davet: {revokedInvitationCount}
          </span>
          {activeUserRoleCounts.map(([role, count]) => (
            <span
              className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1"
              key={role}
            >
              Rol {role}: {count}
            </span>
          ))}
        </div>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Aktif Kullanıcılar</h3>
      </div>
      <div className="flex flex-wrap items-end gap-2 px-4 pb-3">
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          Aktif kullanıcılarda ara
          <input
            aria-label="Aktif kullanıcılarda ara"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setActiveUserSearch(event.target.value)}
            placeholder="Ad, e-posta, rol veya firma"
            type="search"
            value={activeUserSearch}
          />
        </label>
        {activeUserSearchTerm ? (
          <button
            className="min-h-9 rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle"
            onClick={() => setActiveUserSearch("")}
            type="button"
          >
            Kullanıcı aramasını temizle
          </button>
        ) : null}
        <span className="pb-2 text-xs text-content-subtle">
          {filteredActiveUsers.length} / {overview.activeUsers.length} kullanıcı
        </span>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P1 Aktif Kullanıcılar"
          className="min-w-[860px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Ad Soyad</th>
              <th className="px-4 py-3 font-semibold">E-posta</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Firma</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredActiveUsers.length ? (
              filteredActiveUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold">{user.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    <select aria-label={`Rol ${user.fullName}`} className="rounded border border-divider bg-surface-raised px-2 py-1" value={user.role} onChange={(event) => onUpdateUserRole(user.id, event.target.value as "admin" | "accounting" | "viewer")}>
                      <option value="admin">admin</option>
                      <option value="accounting">accounting</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">{user.companyName}</td>
                  <td className="px-4 py-3">{user.statusLabel}</td>
                  <td className="px-4 py-3">
                    <button
                      aria-label={`Devre Dışı Bırak ${user.fullName}`}
                      className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                      disabled={user.userId === currentUserId}
                      onClick={() => onDeactivateUser(user.id)}
                      title={
                        user.userId === currentUserId
                          ? "Kendi erişiminizi bu ekrandan devre dışı bırakamazsınız."
                          : undefined
                      }
                      type="button"
                    >
                      {user.userId === currentUserId
                        ? "Kendi erişiminiz"
                        : "Devre Dışı Bırak"}
                    </button>
                  </td>
                </tr>
              ))
            ) : overview.activeUsers.length ? (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={6}>
                  Aramaya uyan aktif kullanıcı yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={6}>
                  Henüz aktif kullanıcı kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Davet Geçmişi</h3>
      </div>
      <div className="flex flex-wrap items-end gap-2 px-4 pb-3">
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          Davet geçmişinde ara
          <input
            aria-label="Davet geçmişinde ara"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setInvitationSearch(event.target.value)}
            placeholder="E-posta, rol veya durum"
            type="search"
            value={invitationSearch}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          Davet durumu
          <select
            aria-label="Davet durumu filtresi"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setInvitationStatusFilter(event.target.value)}
            value={invitationStatusFilter}
          >
            <option value="all">Tüm durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="accepted">Kabul Edildi</option>
            <option value="expired">Süresi Doldu</option>
            <option value="revoked">İptal Edildi</option>
          </select>
        </label>
        {invitationSearchTerm || invitationStatusFilter !== "all" ? (
          <button
            className="min-h-9 rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle"
            onClick={() => {
              setInvitationSearch("");
              setInvitationStatusFilter("all");
            }}
            type="button"
          >
            Davet filtrelerini temizle
          </button>
        ) : null}
        <span className="pb-2 text-xs text-content-subtle">
          {filteredInvitations.length} / {overview.invitations.length} davet
        </span>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P1 Davet Geçmişi"
          className="min-w-[760px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">E-posta</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">Geçerlilik</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredInvitations.length ? (
              filteredInvitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {invitation.email}
                  </td>
                  <td className="px-4 py-3">{invitation.role}</td>
                  <td className="px-4 py-3">{invitation.statusLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(invitation.expiresAt)}
                  </td>
                  <td className="px-4 py-3">
                    {invitation.status === "pending" ? (
                      <button
                        aria-label={`Daveti İptal Et ${invitation.email}`}
                        className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                        onClick={() => onRevokeInvitation(invitation.id)}
                        type="button"
                      >
                        İptal Et
                      </button>
                    ) : invitation.status === "expired" ||
                      invitation.status === "revoked" ? (
                      <button
                        aria-label={`Daveti Yeniden Gönder ${invitation.email}`}
                        className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle transition hover:bg-brand-primary-subtle"
                        onClick={() => onResendInvitation(invitation.id)}
                        type="button"
                      >
                        Yeniden Gönder
                      </button>
                    ) : (
                      <span className="text-content-subtle">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : overview.invitations.length ? (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={5}>
                  Aramaya uyan davet yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={5}>
                  Henüz davet kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Davet E-posta Kuyruğu</h3>
      </div>
      <div className="flex flex-wrap items-end gap-2 px-4 pb-3">
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          E-posta kuyruğunda ara
          <input
            aria-label="Davet e-posta kuyruğunda ara"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setEmailOutboxSearch(event.target.value)}
            placeholder="Alıcı, şablon, konu veya durum"
            type="search"
            value={emailOutboxSearch}
          />
        </label>
        {emailOutboxSearchTerm ? (
          <button
            className="min-h-9 rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle"
            onClick={() => setEmailOutboxSearch("")}
            type="button"
          >
            E-posta aramasını temizle
          </button>
        ) : null}
        <span className="pb-2 text-xs text-content-subtle">
          {filteredEmailOutboxMessages.length} / {emailOutboxMessages.length} ileti
        </span>
        <span className="pb-2 text-xs text-content-subtle">
          Bekliyor: {pendingEmailCount} · Gönderildi: {sentEmailCount} · Hatalı: {failedEmailCount}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P1 Davet E-posta Kuyruğu"
          className="min-w-[860px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Oluşturma</th>
              <th className="px-4 py-3 font-semibold">Alıcı</th>
              <th className="px-4 py-3 font-semibold">Şablon</th>
              <th className="px-4 py-3 font-semibold">Konu</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredEmailOutboxMessages.length ? (
              filteredEmailOutboxMessages.map((message) => (
                <tr key={message.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(message.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {message.recipientEmail}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {message.template}
                  </td>
                  <td className="px-4 py-3">{message.subject}</td>
                  <td className="px-4 py-3">{message.statusLabel}</td>
                </tr>
              ))
            ) : emailOutboxMessages.length ? (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={5}>
                  Aramaya uyan e-posta kuyruğu kaydı yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={5}>
                  Henüz davet e-posta kuyruğu kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-divider px-4 py-3">
        <h3 className="text-sm font-semibold">Kullanıcı Audit Geçmişi</h3>
      </div>
      <div className="flex flex-wrap items-end gap-2 px-4 pb-3">
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          Audit araması
          <input
            aria-label="Kullanıcı audit geçmişinde ara"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setAuditSearch(event.target.value)}
            placeholder="Aksiyon, kayıt veya detay"
            type="search"
            value={auditSearch}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          Aksiyon filtresi
          <select
            aria-label="Kullanıcı audit aksiyon filtresi"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setAuditActionFilter(event.target.value)}
            value={auditActionFilter}
          >
            <option value="all">Tüm aksiyonlar</option>
            {auditActionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          Başlangıç tarihi
          <input
            aria-label="Kullanıcı audit başlangıç tarihi"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setAuditDateFrom(event.target.value)}
            type="date"
            value={auditDateFrom}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-content-subtle">
          Bitiş tarihi
          <input
            aria-label="Kullanıcı audit bitiş tarihi"
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content"
            onChange={(event) => setAuditDateTo(event.target.value)}
            type="date"
            value={auditDateTo}
          />
        </label>
        {auditSearchTerm || auditActionFilter !== "all" || auditDateFrom || auditDateTo ? (
          <button
            className="min-h-9 rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle"
            onClick={() => {
              setAuditSearch("");
              setAuditActionFilter("all");
              setAuditDateFrom("");
              setAuditDateTo("");
            }}
            type="button"
          >
            Audit filtrelerini temizle
          </button>
        ) : null}
        <span className="pb-2 text-xs text-content-subtle">
          {filteredAuditLogs.length} / {overview.auditLogs.length} kayıt
        </span>
        {auditDateFrom && auditDateTo && auditDateFrom > auditDateTo ? (
          <span className="pb-2 text-xs font-semibold text-danger" role="alert">
            Başlangıç tarihi bitiş tarihinden sonra olamaz.
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="P1 Kullanıcı Audit Geçmişi"
          className="min-w-[760px] w-full text-left text-sm"
        >
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">Aksiyon</th>
              <th className="px-4 py-3 font-semibold">Kayıt</th>
              <th className="px-4 py-3 font-semibold">Detay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredAuditLogs.length ? (
              filteredAuditLogs.map((auditLog) => (
                <tr key={auditLog.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateFromIso(auditLog.occurredAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {auditLog.action}
                  </td>
                  <td className="px-4 py-3">{auditLog.entityLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {auditLog.detail}
                  </td>
                </tr>
              ))
            ) : overview.auditLogs.length ? (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={4}>
                  Seçili filtreye uyan audit kaydı yok.
                </td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-4 text-content-subtle" colSpan={4}>
                  Henüz kullanıcı yönetimi audit kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isInvitePanelOpen ? (
        <div
          aria-label={invitePolicy.buttonLabel}
          className="border-t border-divider bg-surface-muted p-4"
          role="dialog"
        >
          <p className="text-sm font-semibold">{invitePolicy.helperText}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 md:items-end xl:grid-cols-[1fr_280px_280px_auto]">
            <label className="grid gap-1 text-sm font-medium">
              E-posta
              <input
                className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
                onChange={(event) => onInviteEmailChange(event.target.value)}
                type="email"
                value={inviteEmail}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Rol
              <select
                className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
                onChange={(event) => onInviteRoleChange(event.target.value)}
                value={inviteRole}
              >
                {userTypeRows.map((row) => (
                  <option key={row.type} value={row.type}>
                    {row.type}
                  </option>
                ))}
              </select>
            </label>
            {inviteRole === CUSTOM_RBAC_USER_TYPE ? (
              <label className="grid gap-1 text-sm font-medium">
                Yetki profili
                <select
                  className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content"
                  onChange={(event) =>
                    onInviteAccessProfileChange(event.target.value)
                  }
                  value={inviteAccessProfileId}
                >
                  <option value="">Aktif profil seçin</option>
                  {accessProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold transition hover:bg-brand-primary-subtle"
              onClick={onPrepareInvite}
              disabled={
                inviteRole === CUSTOM_RBAC_USER_TYPE &&
                !inviteAccessProfileId
              }
              type="button"
            >
              Davet Gönder
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const emptyUserManagementOverview: UserManagementOverview = {
  activeUsers: [],
  auditLogs: [],
  emailOutboxMessages: [],
  invitations: [],
  summary: {
    acceptedInvitationCount: 0,
    activeUserCount: 0,
    pendingInvitationCount: 0,
  },
};

const emptyBankIntegrationOverview: BankIntegrationOverview = {
  connections: [],
  manualMatchCandidates: [],
  matchSuggestions: [],
  recentTransactions: [],
  supportedBanks: [
    { bankCode: "vakifbank", bankName: "VakıfBank", status: "Mevcut" },
    { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
    { bankCode: "qnb", bankName: "QNB Finansbank", status: "Mevcut" },
    { bankCode: "akbank", bankName: "Akbank", status: "Mevcut" },
    { bankCode: "yapikredi", bankName: "Yapı Kredi", status: "Mevcut" },
    { bankCode: "garanti", bankName: "Garanti BBVA", status: "Mevcut" },
    { bankCode: "ziraat", bankName: "Ziraat Bankası", status: "Yakında" },
  ],
};

function filterManualMatchCandidatesForTransaction(
  candidates: BankTransactionManualMatchCandidate[],
  transaction: BankTransactionView,
) {
  return evaluateManualBankTransactionMatchCandidates({ candidates, transaction });
}

function summarizeManualMatchCandidatesForTransaction(
  candidates: BankTransactionManualMatchCandidateEvaluation[],
) {
  const exactCount = candidates.filter((candidate) => candidate.matchKind === "exact").length;
  const partialCount = candidates.filter((candidate) => candidate.matchKind === "partial").length;

  if (exactCount && partialCount) {
    return `${exactCount} tam eşleşme, ${partialCount} kısmi taslak`;
  }

  if (exactCount) {
    return `${exactCount} tam eşleşme`;
  }

  if (partialCount) {
    return `${partialCount} kısmi taslak`;
  }

  return "Eşleşme adayı yok";
}

function formatManualMatchCandidateOption(
  candidate: BankTransactionManualMatchCandidateEvaluation,
  transaction: BankTransactionView,
) {
  const baseLabel = `${candidate.cashBankMovementDocumentNo} · ${candidate.cashBankMovementLabel}`;

  if (candidate.matchKind === "exact") {
    return baseLabel;
  }

  return `${baseLabel} · Kısmi taslak · Fark ${formatCurrency(
    candidate.differenceAmount,
    transaction.currency,
  )}`;
}

function removeActiveUserFromOverview(
  overview: UserManagementOverview,
  accessId: string,
): UserManagementOverview {
  const activeUsers = overview.activeUsers.filter((user) => user.id !== accessId);

  return {
    ...overview,
    activeUsers,
    summary: {
      ...overview.summary,
      activeUserCount: activeUsers.length,
    },
  };
}

function updateInvitationInOverview(
  overview: UserManagementOverview,
  invitationId: string,
  patch: Partial<{
    expiresAt: string;
    status: string;
    statusLabel: string;
  }>,
): UserManagementOverview {
  const invitations = overview.invitations.map((invitation) =>
    invitation.id === invitationId ? { ...invitation, ...patch } : invitation,
  );

  return {
    ...overview,
    invitations,
    summary: {
      ...overview.summary,
      pendingInvitationCount: invitations.filter(
        (invitation) => invitation.status === "pending",
      ).length,
    },
  };
}

function upsertBankConnection(
  overview: BankIntegrationOverview,
  connection: BankIntegrationConnectionView,
): BankIntegrationOverview {
  const existingIndex = overview.connections.findIndex(
    (row) =>
      row.bankCode === connection.bankCode &&
      row.environmentLabel === connection.environmentLabel,
  );

  if (existingIndex === -1) {
    return {
      ...overview,
      connections: [...overview.connections, connection].sort((left, right) =>
        left.bankName.localeCompare(right.bankName, "tr"),
      ),
    };
  }

  const connections = [...overview.connections];
  connections[existingIndex] = connection;

  return {
    ...overview,
    connections,
  };
}

function normalizeBankSyncDateRange(
  dateRange: BankTransactionSyncDateRange,
): BankTransactionSyncDateRange {
  return {
    dateFrom: dateRange.dateFrom?.trim() || undefined,
    dateTo: dateRange.dateTo?.trim() || undefined,
  };
}

function validateBankSyncDateRange(dateRange: BankTransactionSyncDateRange) {
  if (dateRange.dateFrom && dateRange.dateTo && dateRange.dateFrom > dateRange.dateTo) {
    return "Banka hareketi başlangıç tarihi bitiş tarihinden sonra olamaz.";
  }

  return undefined;
}

function formatBankSyncDateRangeNotice(dateRange: BankTransactionSyncDateRange) {
  if (dateRange.dateFrom && dateRange.dateTo) {
    return ` · ${dateRange.dateFrom} - ${dateRange.dateTo}`;
  }

  if (dateRange.dateFrom) {
    return ` · ${dateRange.dateFrom} sonrası`;
  }

  if (dateRange.dateTo) {
    return ` · ${dateRange.dateTo} öncesi`;
  }

  return "";
}

function removeManualMatchCandidateFromOverview(
  overview: BankIntegrationOverview,
  cashBankMovementId: string,
): BankIntegrationOverview {
  return {
    ...overview,
    manualMatchCandidates: (overview.manualMatchCandidates ?? []).filter(
      (candidate) => candidate.cashBankMovementId !== cashBankMovementId,
    ),
  };
}
function upsertBankTransactions(
  overview: BankIntegrationOverview,
  transactions: BankTransactionView[],
): BankIntegrationOverview {
  const byId = new Map(
    overview.recentTransactions.map((transaction) => [transaction.id, transaction]),
  );

  for (const transaction of transactions) {
    byId.set(transaction.id, transaction);
  }

  return {
    ...overview,
    recentTransactions: Array.from(byId.values())
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, 20),
  };
}

function removeBankMatchSuggestion(
  overview: BankIntegrationOverview,
  values: {
    cashBankMovementId: string;
    transactionId: string;
  },
): BankIntegrationOverview {
  return {
    ...overview,
    matchSuggestions: overview.matchSuggestions.filter(
      (suggestion) =>
        suggestion.bankTransactionId !== values.transactionId ||
        suggestion.cashBankMovementId !== values.cashBankMovementId,
    ),
  };
}

function resolveSelectedCashBankAccountOption({
  accountCodeByTransaction,
  accountOptions,
  overview,
  selectionKey,
  transactionId,
}: {
  accountCodeByTransaction: Record<string, string>;
  accountOptions: CashBankAccountOption[];
  overview: BankIntegrationOverview;
  selectionKey?: string;
  transactionId: string;
}) {
  const selectedCode =
    (selectionKey ? accountCodeByTransaction[selectionKey] : undefined) ??
    accountCodeByTransaction[transactionId];

  return (
    accountOptions.find((account) => account.code === selectedCode) ??
    resolveDefaultCashBankAccountOption({
      accountOptions,
      overview,
      transactionId,
    }) ??
    accountOptions[0]
  );
}

function buildPartialCashBankAccountSelectionKey({
  cashBankMovementId,
  transactionId,
}: {
  cashBankMovementId: string;
  transactionId: string;
}) {
  return `${transactionId}::${cashBankMovementId}`;
}

function resolveDefaultCashBankAccountOption({
  accountOptions,
  overview,
  transactionId,
}: {
  accountOptions: CashBankAccountOption[];
  overview: BankIntegrationOverview;
  transactionId: string;
}) {
  const transaction = overview.recentTransactions.find(
    (item) => item.id === transactionId,
  );
  const connection = overview.connections.find(
    (item) =>
      item.status === "connected" && item.bankName === transaction?.bankName,
  );
  const bankName = connection?.bankName ?? transaction?.bankName;

  if (!bankName) {
    return undefined;
  }

  const normalizedBankName = normalizeBankAccountMatchText(bankName);

  return accountOptions.find((account) =>
    normalizeBankAccountMatchText(account.name).includes(normalizedBankName),
  );
}

function normalizeBankAccountMatchText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toBankConnectionView(
  connection: BankIntegrationConnectionRow,
): BankIntegrationConnectionView {
  return {
    bankCode: connection.bankCode,
    bankName: connection.bankName,
    consentId: connection.consentId,
    environmentLabel: "Sandbox",
    id: connection.id,
    lastTestedAt: connection.lastTestedAt,
    lastTestMessage: connection.lastTestMessage,
    lastTestStatus: connection.lastTestStatus,
    status: connection.status,
    statusLabel: connection.status === "connected" ? "Bağlı" : "Hatalı",
  };
}

function toBankTransactionView(transaction: BankTransactionRow): BankTransactionView {
  return {
    amount: transaction.amount,
    bankName: transaction.bankName,
    currency: transaction.currency,
    description: transaction.description,
    direction: transaction.direction,
    id: transaction.id,
    occurredAt: transaction.occurredAt,
    status: transaction.status,
    statusLabel: formatBankTransactionStatusLabel(transaction.status),
  };
}

function formatBankTransactionStatusLabel(status: string) {
  if (status === "matched") {
    return "Eşleştirildi";
  }

  if (status === "ignored") {
    return "Yoksayıldı";
  }

  return "Bekliyor";
}

function formatCurrency(amount: number, currency: string) {
  const formattedAmount = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);

  return `${formattedAmount} ${currency === "TRY" ? "TL" : currency}`;
}

function formatInvitationStatusLabel(status: string) {
  if (status === "revoked") {
    return "İptal Edildi";
  }

  if (status === "accepted") {
    return "Kabul Edildi";
  }

  if (status === "pending") {
    return "Bekliyor";
  }

  if (status === "expired") {
    return "Süresi Doldu";
  }

  return status;
}

function AuditScopePanel({ auditScopes }: { auditScopes: string[] }) {
  return (
    <aside className="rounded-ui-panel border border-divider bg-surface-raised p-4">
      <h2 className="text-sm font-semibold">Denetim Günlüğü Kapsamı</h2>
      <p className="mt-2 text-sm leading-6 text-content-subtle">
        P0 kritik hareketlerinde audit kaydı iş akışının parçasıdır. Ayarlar
        ekranı bu kapsamı görünür kılar; ledger kayıtları işlem, tarih, kullanıcı
        ve metadata ayrıntılarıyla filtrelenebilir.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {auditScopes.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--ds-info)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}





