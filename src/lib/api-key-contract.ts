export const API_KEY_SCOPES = [
  { key: "api-keys", label: "API anahtarları" },
  { key: "integration", label: "Entegrasyon tanılama" },
  { key: "audit", label: "Audit kayıtları" },
  { key: "ledger", label: "Ledger / muhasebe" },
  { key: "user-management", label: "Kullanıcı yönetimi" },
  { key: "e-invoice", label: "e-Fatura / e-Arşiv" },
  { key: "invoices", label: "Faturalar" },
  { key: "purchase-invoices", label: "Alış Faturaları" },
  { key: "counterparties", label: "Cari Hesaplar" },
  { key: "stock", label: "Stok" },
  { key: "projects", label: "Proje / Şantiye" },
  { key: "checks", label: "Çekler" },
  { key: "tenders", label: "İhaleler" },
  { key: "progress-payments", label: "Hakedişler" },
  { key: "documents", label: "Dökümanlar" },
  { key: "vehicles", label: "Araçlar" },
  { key: "expenses", label: "Giderler" },
  { key: "employees", label: "Personel" },
  { key: "payroll", label: "Bordro" },
  { key: "timesheets", label: "Puantaj" },
  { key: "cash-bank", label: "Kasa / Banka" },
  { key: "notifications", label: "Bildirimler" },
  { key: "contractors", label: "Taşeronlar" },
  { key: "suppliers", label: "Tedarikçiler" },
  { key: "customers", label: "Müşteriler" },
  { key: "stock-cards", label: "Stok Kartları" },
  { key: "stock-minimums", label: "Stok Minimum Eşikleri" },
  { key: "subscriptions", label: "Abonelik" },
  { key: "bank-transactions", label: "Banka Hareketleri" },
  { key: "webhooks", label: "Webhook" },
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]["key"];
export type ApiKeyStatus = "active" | "expired" | "revoked";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  rateLimitPerSecond: number;
  expiresAt: string;
  lastUsedAt: string;
  revokedAt: string;
  revokedBy: string;
  createdBy: string;
  createdAt: string;
  status: ApiKeyStatus;
};

export type ApiKeyOverview = {
  rows: ApiKeyRow[];
  summary: {
    totalCount: number;
    activeCount: number;
    expiredCount: number;
    revokedCount: number;
  };
};

export type CreateApiKeyValues = {
  name: string;
  scopes: string[];
  rateLimitPerSecond: number;
  expiresAt?: string;
};
