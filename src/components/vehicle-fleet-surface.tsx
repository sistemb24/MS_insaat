"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import type { ArventoVehicleFleetOverview } from "@/lib/arvento-fleet-service";
import type { AuditLogEntry } from "@/lib/audit-log";
import {
  buildVehicleAuditCsvFileName,
  buildVehicleAuditCsvHref,
  formatVehicleAuditAction,
  getVehicleAuditChanges,
  getVehicleAuditStatus,
} from "@/lib/vehicle-audit-export";
import type { VehicleCardDraftValues, VehicleCardRow } from "@/lib/vehicle-service";

type VehicleFleetMutationResult =
  | { ok: true; data: { row: unknown } }
  | { ok: false; code?: string; errors: string[] };

const vehicleUpdateConflictCode = "VEHICLE_UPDATE_CONFLICT";

type VehicleFleetPersistence = {
  activateVehicleCard?: (vehicleId: string) => Promise<VehicleFleetMutationResult>;
  createVehicleCard?: (
    values: VehicleCardDraftValues,
  ) => Promise<VehicleFleetMutationResult>;
  deactivateVehicleCard?: (vehicleId: string) => Promise<VehicleFleetMutationResult>;
  updateVehicleCard?: (
    vehicleId: string,
    expectedUpdatedAt: string,
    values: VehicleCardDraftValues,
  ) => Promise<VehicleFleetMutationResult>;
};

type VehicleFleetSurfaceProps = {
  auditEntries?: AuditLogEntry[];
  overview: ArventoVehicleFleetOverview;
  persistence?: VehicleFleetPersistence;
  vehicleCards?: VehicleCardRow[];
};

type VehicleDeactivationConfirmation = {
  id: string;
  plate: string;
  siteName: string;
  vehicleLabel: string;
};

type VehicleCardFormState = {
  acquisitionDate: string;
  arventoDeviceId: string;
  brand: string;
  chassisNumber: string;
  dispositionDate: string;
  insuranceEndDate: string;
  inspectionEndDate: string;
  maintenanceDueDate: string;
  registrationDate: string;
  driverName: string;
  engineNumber: string;
  entryOdometerKm: string;
  fuelType: string;
  modelName: string;
  modelYear: string;
  plate: string;
  siteCode: string;
  siteName: string;
  vehicleType: string;
};

type VehicleAlertTypeFilter =
  | "all"
  | "insurance"
  | "inspection"
  | "signal"
  | "maintenance"
  | "fuel";

const emptyVehicleCardForm: VehicleCardFormState = {
  acquisitionDate: "",
  arventoDeviceId: "",
  brand: "",
  chassisNumber: "",
  dispositionDate: "",
  insuranceEndDate: "",
  inspectionEndDate: "",
  maintenanceDueDate: "",
  registrationDate: "",
  driverName: "",
  engineNumber: "",
  entryOdometerKm: "",
  fuelType: "",
  modelName: "",
  modelYear: "",
  plate: "",
  siteCode: "",
  siteName: "",
  vehicleType: "",
};

export function VehicleFleetSurface({
  auditEntries = [],
  overview,
  persistence,
  vehicleCards = [],
}: VehicleFleetSurfaceProps) {
  const { alerts, rows, summary } = overview;
  const [draft, setDraft] = useState<VehicleCardFormState>(emptyVehicleCardForm);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editingVehicleUpdatedAt, setEditingVehicleUpdatedAt] = useState<
    string | null
  >(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [hasVehicleUpdateConflict, setHasVehicleUpdateConflict] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [passiveVehicleSearch, setPassiveVehicleSearch] = useState("");
  const [activeVehicleSearch, setActiveVehicleSearch] = useState("");
  const [alertSearch, setAlertSearch] = useState("");
  const [alertTypeFilter, setAlertTypeFilter] =
    useState<VehicleAlertTypeFilter>("all");
  const [auditPlateFilter, setAuditPlateFilter] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditUserFilter, setAuditUserFilter] = useState("");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [activationConfirmation, setActivationConfirmation] =
    useState<VehicleDeactivationConfirmation | null>(null);
  const [deactivationConfirmation, setDeactivationConfirmation] =
    useState<VehicleDeactivationConfirmation | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const activateVehicleCard = persistence?.activateVehicleCard;
  const createVehicleCard = persistence?.createVehicleCard;
  const deactivateVehicleCard = persistence?.deactivateVehicleCard;
  const updateVehicleCard = persistence?.updateVehicleCard;
  const passiveVehicleCards = vehicleCards.filter(
    (vehicleCard) => vehicleCard.status === "Pasif",
  );
  const passiveVehicleSearchTerm = passiveVehicleSearch
    .trim()
    .toLocaleLowerCase("tr-TR");
  const filteredPassiveVehicleCards = passiveVehicleSearchTerm
    ? passiveVehicleCards.filter((vehicleCard) =>
        getPassiveVehicleSearchText(vehicleCard).includes(passiveVehicleSearchTerm),
      )
    : passiveVehicleCards;
  const vehicleSiteSuggestions = getVehicleSiteSuggestions(rows, vehicleCards);
  const vehicleTypeSuggestions = getVehicleTypeSuggestions(rows, vehicleCards);
  const vehicleBrandSuggestions = getVehicleBrandSuggestions(rows, vehicleCards);
  const vehicleModelSuggestions = getVehicleModelSuggestions(rows, vehicleCards);
  const vehicleDriverSuggestions = getVehicleDriverSuggestions(rows, vehicleCards);
  const vehicleFuelTypeSuggestions = getVehicleFuelTypeSuggestions(vehicleCards);
  const vehicleCardsById = new Map(
    vehicleCards.map((vehicleCard) => [vehicleCard.id, vehicleCard]),
  );
  const activeVehicleSearchTerm = activeVehicleSearch
    .trim()
    .toLocaleLowerCase("tr-TR");
  const filteredRows = activeVehicleSearchTerm
    ? rows.filter((row) =>
        getActiveVehicleSearchText(row, vehicleCardsById).includes(
          activeVehicleSearchTerm,
        ),
      )
    : rows;
  const alertSearchTerm = alertSearch.trim().toLocaleLowerCase("tr-TR");
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      !alertSearchTerm || getVehicleAlertSearchText(alert).includes(alertSearchTerm);
    const matchesType =
      alertTypeFilter === "all" || getVehicleAlertType(alert) === alertTypeFilter;

    return matchesSearch && matchesType;
  });
  const auditPlateFilterTerm = normalizeVehicleAuditFilter(auditPlateFilter);
  const auditUserFilterTerm = normalizeVehicleAuditFilter(auditUserFilter);
  const hasInvalidAuditDateRange = Boolean(
    auditStartDate && auditEndDate && auditStartDate > auditEndDate,
  );
  const auditActionOptions = Array.from(
    new Set(auditEntries.map((entry) => entry.action)),
  ).sort((first, second) =>
    formatVehicleAuditAction(first).localeCompare(
      formatVehicleAuditAction(second),
      "tr",
    ),
  );
  const filteredAuditEntries = auditEntries.filter((entry) => {
    const matchesPlate = normalizeVehicleAuditFilter(entry.entityLabel).includes(
      auditPlateFilterTerm,
    );
    const matchesAction = !auditActionFilter || entry.action === auditActionFilter;
    const matchesUser = normalizeVehicleAuditFilter(entry.actorUserId).includes(
      auditUserFilterTerm,
    );
    const entryDate = getVehicleAuditLocalDateKey(entry.occurredAt);
    const matchesDateRange =
      !hasInvalidAuditDateRange &&
      (!auditStartDate || entryDate >= auditStartDate) &&
      (!auditEndDate || entryDate <= auditEndDate);

    return matchesPlate && matchesAction && matchesUser && matchesDateRange;
  });
  const hasActiveAuditFilter = Boolean(
    auditPlateFilterTerm ||
      auditActionFilter ||
      auditUserFilterTerm ||
      auditStartDate ||
      auditEndDate,
  );

  useEffect(() => {
    if (!activationConfirmation && !deactivationConfirmation) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        setActivationConfirmation(null);
        setDeactivationConfirmation(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activationConfirmation, deactivationConfirmation, isPending]);

  function updateDraft(field: keyof VehicleCardFormState, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function clearAuditFilters() {
    setAuditPlateFilter("");
    setAuditActionFilter("");
    setAuditUserFilter("");
    setAuditStartDate("");
    setAuditEndDate("");
  }

  function clearActiveVehicleSearch() {
    setActiveVehicleSearch("");
  }

  function clearPassiveVehicleSearch() {
    setPassiveVehicleSearch("");
  }

  function clearAlertSearch() {
    setAlertSearch("");
    setAlertTypeFilter("all");
  }

  function handleVehicleCardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingVehicleId ? !updateVehicleCard : !createVehicleCard) {
      return;
    }

    const values: VehicleCardDraftValues = {
      acquisitionDate: draft.acquisitionDate,
      arventoDeviceId: draft.arventoDeviceId.trim(),
      brand: draft.brand.trim(),
      chassisNumber: draft.chassisNumber.trim(),
      dispositionDate: draft.dispositionDate,
      insuranceEndDate: draft.insuranceEndDate,
      inspectionEndDate: draft.inspectionEndDate,
      maintenanceDueDate: draft.maintenanceDueDate,
      registrationDate: draft.registrationDate,
      driverName: draft.driverName.trim(),
      engineNumber: draft.engineNumber.trim(),
      entryOdometerKm: draft.entryOdometerKm.trim(),
      fuelType: draft.fuelType.trim(),
      modelName: draft.modelName.trim(),
      modelYear: draft.modelYear.trim(),
      plate: draft.plate.trim(),
      ...(editingVehicleId ? { siteCode: draft.siteCode.trim() } : {}),
      siteName: draft.siteName.trim(),
      vehicleType: draft.vehicleType.trim(),
    };

    startTransition(() => {
      void submitVehicleCard(
        values,
        editingVehicleId,
        editingVehicleUpdatedAt,
      );
    });
  }

  async function submitVehicleCard(
    values: VehicleCardDraftValues,
    vehicleId: string | null,
    expectedUpdatedAt: string | null,
  ) {
    if (vehicleId && !expectedUpdatedAt) {
      setStatusMessage("");
      setFormErrors(["Araç kartı sürüm bilgisi bulunamadı."]);
      return;
    }

    const result =
      vehicleId && expectedUpdatedAt
        ? await updateVehicleCard?.(vehicleId, expectedUpdatedAt, values)
        : await createVehicleCard?.(values);

    if (!result) {
      return;
    }

    if (result.ok) {
      setDraft(emptyVehicleCardForm);
      setEditingVehicleId(null);
      setEditingVehicleUpdatedAt(null);
      setFormErrors([]);
      setHasVehicleUpdateConflict(false);
      setStatusMessage(
        vehicleId ? "Araç kartı güncellendi." : "Araç kartı kaydedildi.",
      );
      router.refresh();
      return;
    }

    setStatusMessage("");
    setFormErrors(result.errors);
    setHasVehicleUpdateConflict(result.code === vehicleUpdateConflictCode);
  }

  function handleDeactivateVehicleCardRequest(
    vehicle: VehicleDeactivationConfirmation,
  ) {
    if (!deactivateVehicleCard) {
      return;
    }

    setActivationConfirmation(null);
    setFormErrors([]);
    setStatusMessage("");
    setDeactivationConfirmation(vehicle);
  }

  function handleDeactivateVehicleCardConfirm() {
    if (!deactivationConfirmation) {
      return;
    }

    const vehicleId = deactivationConfirmation.id;

    startTransition(() => {
      void submitDeactivateVehicleCard(vehicleId);
    });
  }

  async function submitDeactivateVehicleCard(vehicleId: string) {
    if (!deactivateVehicleCard) {
      return;
    }

    const result = await deactivateVehicleCard(vehicleId);

    if (result.ok) {
      setFormErrors([]);
      setStatusMessage("Araç kartı pasife alındı.");
      setDeactivationConfirmation(null);
      router.refresh();
      return;
    }

    setStatusMessage("");
    setDeactivationConfirmation(null);
    setFormErrors(result.errors);
  }

  function handleVehicleCardEdit(vehicleCard: VehicleCardRow) {
    setDraft({
      acquisitionDate: vehicleCard.acquisitionDate ?? "",
      arventoDeviceId: vehicleCard.arventoDeviceId,
      brand: vehicleCard.brand,
      chassisNumber: vehicleCard.chassisNumber ?? "",
      dispositionDate: vehicleCard.dispositionDate ?? "",
      insuranceEndDate: vehicleCard.insuranceEndDate ?? "",
      inspectionEndDate: vehicleCard.inspectionEndDate ?? "",
      maintenanceDueDate: vehicleCard.maintenanceDueDate ?? "",
      registrationDate: vehicleCard.registrationDate ?? "",
      driverName: vehicleCard.driverName,
      engineNumber: vehicleCard.engineNumber ?? "",
      entryOdometerKm:
        (vehicleCard.entryOdometerKm ?? 0) > 0
          ? String(vehicleCard.entryOdometerKm)
          : "",
      fuelType: vehicleCard.fuelType ?? "",
      modelName: vehicleCard.modelName,
      modelYear: vehicleCard.modelYear > 0 ? String(vehicleCard.modelYear) : "",
      plate: vehicleCard.plate,
      siteCode: vehicleCard.siteCode,
      siteName: vehicleCard.siteName,
      vehicleType: vehicleCard.vehicleType,
    });
    setEditingVehicleId(vehicleCard.id);
    setEditingVehicleUpdatedAt(vehicleCard.updatedAt);
    setFormErrors([]);
    setHasVehicleUpdateConflict(false);
    setStatusMessage("");
    document.getElementById("vehicle-card-form")?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleVehicleCardEditCancel() {
    setDraft(emptyVehicleCardForm);
    setEditingVehicleId(null);
    setEditingVehicleUpdatedAt(null);
    setFormErrors([]);
    setHasVehicleUpdateConflict(false);
    setStatusMessage("");
  }

  function handleVehicleUpdateConflictReload() {
    setDraft(emptyVehicleCardForm);
    setEditingVehicleId(null);
    setEditingVehicleUpdatedAt(null);
    setFormErrors([]);
    setHasVehicleUpdateConflict(false);
    setStatusMessage(
      "Güncel araç kartı yüklendi. Düzenlemek için kaydı yeniden açın.",
    );
    router.refresh();
  }

  function handleActivateVehicleCardRequest(
    vehicle: VehicleDeactivationConfirmation,
  ) {
    if (!activateVehicleCard) {
      return;
    }

    setActivationConfirmation(vehicle);
    setDeactivationConfirmation(null);
    setFormErrors([]);
    setStatusMessage("");
  }

  function handleActivateVehicleCardConfirm() {
    if (!activationConfirmation) {
      return;
    }

    const vehicleId = activationConfirmation.id;

    startTransition(() => {
      void submitActivateVehicleCard(vehicleId);
    });
  }

  async function submitActivateVehicleCard(vehicleId: string) {
    if (!activateVehicleCard) {
      return;
    }

    const result = await activateVehicleCard(vehicleId);

    if (result.ok) {
      setActivationConfirmation(null);
      setFormErrors([]);
      setStatusMessage("Araç kartı aktifleştirildi.");
      router.refresh();
      return;
    }

    setActivationConfirmation(null);
    setStatusMessage("");
    setFormErrors(result.errors);
  }
  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          P2 araç ve GPS
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Araç / Filo Yönetimi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              Araç kartı, GPS konumu, son hareket zamanı, yakıt seviyesi ve
              bakım uyarısı iş akışları için Arvento sandbox read-model yüzeyi.
            </p>
          </div>
          <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            Canlı API kapalı
          </span>
        </div>
      </header>

      {createVehicleCard ? (
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">
              {editingVehicleId ? "Araç Kartı Düzenle" : "Araç Kartı"}
            </h2>
          </div>
          <form
            className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"
            id="vehicle-card-form"
            onSubmit={handleVehicleCardSubmit}
          >
            <VehicleTextField
              disabled={Boolean(editingVehicleId)}
              label="Plaka"
              name="plate"
              onChange={(value) => updateDraft("plate", value)}
              value={draft.plate}
            />
            <VehicleTextField
              label="Araç Tipi"
              listId="vehicle-type-suggestions"
              name="vehicleType"
              onChange={(value) => updateDraft("vehicleType", value)}
              value={draft.vehicleType}
            />
            <datalist id="vehicle-type-suggestions">
              {vehicleTypeSuggestions.map((vehicleType) => (
                <option key={vehicleType} value={vehicleType} />
              ))}
            </datalist>
            <VehicleTextField
              label="Marka"
              listId="vehicle-brand-suggestions"
              name="brand"
              onChange={(value) => updateDraft("brand", value)}
              value={draft.brand}
            />
            <datalist id="vehicle-brand-suggestions">
              {vehicleBrandSuggestions.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
            <VehicleTextField
              label="Model"
              listId="vehicle-model-suggestions"
              name="modelName"
              onChange={(value) => updateDraft("modelName", value)}
              value={draft.modelName}
            />
            <datalist id="vehicle-model-suggestions">
              {vehicleModelSuggestions.map((modelName) => (
                <option key={modelName} value={modelName} />
              ))}
            </datalist>
            <VehicleTextField
              label="Alındığı/Kiralandığı Tarih"
              name="acquisitionDate"
              onChange={(value) => updateDraft("acquisitionDate", value)}
              type="date"
              value={draft.acquisitionDate}
            />
            <VehicleTextField
              label="Satıldığı/İade Tarihi"
              name="dispositionDate"
              onChange={(value) => updateDraft("dispositionDate", value)}
              type="date"
              value={draft.dispositionDate}
            />
            <VehicleTextField
              label="Sigorta Bitiş Tarihi"
              name="insuranceEndDate"
              onChange={(value) => updateDraft("insuranceEndDate", value)}
              type="date"
              value={draft.insuranceEndDate}
            />
            <VehicleTextField
              label="Muayene Bitiş Tarihi"
              name="inspectionEndDate"
              onChange={(value) => updateDraft("inspectionEndDate", value)}
              type="date"
              value={draft.inspectionEndDate}
            />
            <VehicleTextField
              label="Bakım Tarihi"
              name="maintenanceDueDate"
              onChange={(value) => updateDraft("maintenanceDueDate", value)}
              type="date"
              value={draft.maintenanceDueDate}
            />
            <VehicleTextField
              label="Tescil Tarihi"
              name="registrationDate"
              onChange={(value) => updateDraft("registrationDate", value)}
              type="date"
              value={draft.registrationDate}
            />
            <VehicleTextField
              inputMode="numeric"
              label="Model Yılı"
              maxLength={4}
              name="modelYear"
              onChange={(value) => updateDraft("modelYear", value)}
              pattern="[0-9]{4}"
              value={draft.modelYear}
            />
            <VehicleTextField
              label="Şase No"
              name="chassisNumber"
              onChange={(value) => updateDraft("chassisNumber", value)}
              value={draft.chassisNumber}
            />
            <VehicleTextField
              label="Motor No"
              name="engineNumber"
              onChange={(value) => updateDraft("engineNumber", value)}
              value={draft.engineNumber}
            />
            <VehicleTextField
              inputMode="numeric"
              label="Giriş KM"
              name="entryOdometerKm"
              onChange={(value) => updateDraft("entryOdometerKm", value)}
              pattern="[0-9]*"
              value={draft.entryOdometerKm}
            />
            <VehicleTextField
              label="Yakıt Türü"
              listId="vehicle-fuel-type-suggestions"
              name="fuelType"
              onChange={(value) => updateDraft("fuelType", value)}
              value={draft.fuelType}
            />
            <datalist id="vehicle-fuel-type-suggestions">
              {vehicleFuelTypeSuggestions.map((fuelType) => (
                <option key={fuelType} value={fuelType} />
              ))}
            </datalist>
            <VehicleTextField
              label="Şantiye"
              listId="vehicle-site-suggestions"
              name="siteName"
              onChange={(value) => updateDraft("siteName", value)}
              value={draft.siteName}
            />
            <datalist id="vehicle-site-suggestions">
              {vehicleSiteSuggestions.map((siteName) => (
                <option key={siteName} value={siteName} />
              ))}
            </datalist>
            <VehicleTextField
              label="Sürücü"
              listId="vehicle-driver-suggestions"
              name="driverName"
              onChange={(value) => updateDraft("driverName", value)}
              value={draft.driverName}
            />
            <datalist id="vehicle-driver-suggestions">
              {vehicleDriverSuggestions.map((driverName) => (
                <option key={driverName} value={driverName} />
              ))}
            </datalist>
            <VehicleTextField
              label="Arvento Cihaz ID"
              name="arventoDeviceId"
              onChange={(value) => updateDraft("arventoDeviceId", value)}
              value={draft.arventoDeviceId}
            />
            <div className="flex items-end gap-2">
              {editingVehicleId ? (
                <button
                  className="min-h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold text-[var(--on-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  onClick={handleVehicleCardEditCancel}
                  type="button"
                >
                  Vazgeç
                </button>
              ) : null}
              <button
                className="min-h-10 w-full rounded-[var(--radius-control)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {isPending
                  ? editingVehicleId
                    ? "Güncelleniyor"
                    : "Kaydediliyor"
                  : editingVehicleId
                    ? "Araç Kartını Güncelle"
                    : "Araç Kartı Kaydet"}
              </button>
            </div>
          </form>
          {statusMessage || formErrors.length > 0 ? (
            <div className="border-t border-[var(--grid-border)] px-4 py-3 text-sm">
              {statusMessage ? (
                <p className="font-semibold text-emerald-700">{statusMessage}</p>
              ) : null}
              {formErrors.length > 0 ? (
                <>
                  <ul className="space-y-1 font-semibold text-red-700">
                    {formErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                  {hasVehicleUpdateConflict ? (
                    <button
                      className="mt-3 min-h-9 rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                      onClick={handleVehicleUpdateConflictReload}
                      type="button"
                    >
                      Güncel Kaydı Yükle
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {!createVehicleCard && (statusMessage || formErrors.length > 0) ? (
        <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm">
          {statusMessage ? (
            <p className="font-semibold text-emerald-700">{statusMessage}</p>
          ) : null}
          {formErrors.length > 0 ? (
            <ul className="space-y-1 font-semibold text-red-700">
              {formErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      {activateVehicleCard && passiveVehicleCards.length > 0 ? (
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Pasif Araç Kartları</h2>
              <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 py-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                {passiveVehicleSearchTerm
                  ? `${filteredPassiveVehicleCards.length} / ${passiveVehicleCards.length} pasif kart`
                  : `${passiveVehicleCards.length} pasif kart`}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {passiveVehicleSearchTerm ? (
                <button
                  aria-label="Pasif araç aramasını temizle"
                  className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface)]"
                  onClick={clearPassiveVehicleSearch}
                  type="button"
                >
                  Pasif Aramayı Temizle
                </button>
              ) : null}
              <label className="flex w-full flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)] md:max-w-xs">
                Pasif araçlarda ara
                <input
                  className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                  onChange={(event) => setPassiveVehicleSearch(event.target.value)}
                  placeholder="Plaka, araç, şantiye, sürücü"
                  type="search"
                  value={passiveVehicleSearch}
                />
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table
              aria-label="P2 Pasif Araç Kartları"
              className="min-w-[920px] w-full text-left text-sm"
            >
              <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Plaka</th>
                  <th className="px-4 py-3 font-semibold">Araç</th>
                  <th className="px-4 py-3 font-semibold">Şantiye</th>
                  <th className="px-4 py-3 font-semibold">Sürücü</th>
                  <th className="px-4 py-3 font-semibold">Yakıt Türü</th>
                  <th className="px-4 py-3 font-semibold">Şase No</th>
                  <th className="px-4 py-3 font-semibold">Motor No</th>
                  <th className="px-4 py-3 font-semibold">Giriş KM</th>
                <th className="px-4 py-3 font-semibold">A.Tarihi</th>
                <th className="px-4 py-3 font-semibold">S.Tarihi</th>
                <th className="px-4 py-3 font-semibold">Sigorta Bit.</th>
                <th className="px-4 py-3 font-semibold">Muay. Bit.</th>
                <th className="px-4 py-3 font-semibold">Bakım</th>
                <th className="px-4 py-3 font-semibold">Tescil</th>
                <th className="px-4 py-3 font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--grid-border)]">
                {filteredPassiveVehicleCards.map((vehicleCard) => (
                  <tr key={vehicleCard.id}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {vehicleCard.plate}
                    </td>
                    <td className="px-4 py-3">
                      {formatVehicleCardLabel(vehicleCard)}
                    </td>
                    <td className="px-4 py-3">{vehicleCard.siteName}</td>
                    <td className="px-4 py-3">
                      {vehicleCard.driverName || "Atanmamış"}
                    </td>
                    <td className="px-4 py-3">
                      {vehicleCard.fuelType || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.chassisNumber || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.engineNumber || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {(vehicleCard.entryOdometerKm ?? 0) > 0
                        ? formatNumber(vehicleCard.entryOdometerKm ?? 0)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.acquisitionDate
                        ? formatDateOnly(vehicleCard.acquisitionDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.dispositionDate
                        ? formatDateOnly(vehicleCard.dispositionDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.insuranceEndDate
                        ? formatDateOnly(vehicleCard.insuranceEndDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.inspectionEndDate
                        ? formatDateOnly(vehicleCard.inspectionEndDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.maintenanceDueDate
                        ? formatDateOnly(vehicleCard.maintenanceDueDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {vehicleCard.registrationDate
                        ? formatDateOnly(vehicleCard.registrationDate)
                        : "-"}
                    </td>
                    <td className="flex flex-wrap gap-2 px-4 py-3">
                      {updateVehicleCard ? (
                        <button
                          aria-label={`${vehicleCard.plate} düzenle`}
                          className="min-h-8 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isPending}
                          onClick={() => handleVehicleCardEdit(vehicleCard)}
                          type="button"
                        >
                          Düzenle
                        </button>
                      ) : null}
                      <button
                        aria-label={`${vehicleCard.plate} aktifleştir`}
                        className="min-h-8 rounded-[var(--radius-control)] border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                        onClick={() =>
                          handleActivateVehicleCardRequest({
                            id: vehicleCard.id,
                            plate: vehicleCard.plate,
                            siteName: vehicleCard.siteName,
                            vehicleLabel: formatVehicleCardLabel(vehicleCard),
                          })
                        }
                        type="button"
                      >
                        Aktifleştir
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPassiveVehicleCards.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm font-semibold text-[var(--on-surface-variant)]"
                    colSpan={15}
                  >
                    Pasif araç bulunamadı.
                  </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-10">
        <Metric label="Toplam araç" value={String(summary.vehicleCount)} />
        <Metric label="Hareket" value={String(summary.movingCount)} />
        <Metric label="Park" value={String(summary.parkedCount)} />
        <Metric label="Sinyal kaybı" value={String(summary.signalLostCount)} />
        <Metric label="Uyarı" value={String(summary.alertCount)} />
        <Metric label="Kritik uyarı" value={String(summary.criticalAlertCount)} />
        <Metric label="Sigorta uyarısı" value={String(summary.insuranceAlertCount)} />
        <Metric label="Muayene uyarısı" value={String(summary.inspectionAlertCount)} />
        <Metric label="Bakım uyarısı" value={String(summary.maintenanceAlertCount)} />
        <Metric
          label="Ortalama yakıt"
          value={`${summary.averageFuelLevelPercent}%`}
        />
      </div>

      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="border-b border-[var(--grid-border)] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold">Arvento Araç Uyarıları</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
                {alertSearchTerm || alertTypeFilter !== "all"
                  ? `${filteredAlerts.length} / ${alerts.length} uyarı`
                  : `Son ${alerts.length} uyarı`}
              </span>
              {alertSearchTerm || alertTypeFilter !== "all" ? (
                <button
                  aria-label="Uyarı aramasını temizle"
                  className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface)]"
                  onClick={clearAlertSearch}
                  type="button"
                >
                  Uyarı Aramasını Temizle
                </button>
              ) : null}
              <label className="flex w-full flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)] md:max-w-sm">
                Uyarılarda ara
                <input
                  className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                  onChange={(event) => setAlertSearch(event.target.value)}
                  placeholder="Öncelik, uyarı, plaka, not"
                  type="search"
                  value={alertSearch}
                />
              </label>
              <label className="flex w-full flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)] md:max-w-xs">
                Uyarı türü
                <select
                  aria-label="Uyarı türü filtresi"
                  className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                  onChange={(event) =>
                    setAlertTypeFilter(event.target.value as VehicleAlertTypeFilter)
                  }
                  value={alertTypeFilter}
                >
                  <option value="all">Tüm uyarılar</option>
                  <option value="insurance">Sigorta</option>
                  <option value="inspection">Muayene</option>
                  <option value="signal">Sinyal</option>
                  <option value="maintenance">Bakım</option>
                  <option value="fuel">Yakıt</option>
                </select>
              </label>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table
            aria-label="P2 Arvento Araç Uyarıları"
            className="min-w-[860px] w-full text-left text-sm"
          >
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Öncelik</th>
                <th className="px-4 py-3 font-semibold">Uyarı</th>
                <th className="px-4 py-3 font-semibold">Plaka</th>
                <th className="px-4 py-3 font-semibold">Son Tarih</th>
                <th className="px-4 py-3 font-semibold">Operasyon Notu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-[var(--radius-control)] border px-2 py-1 text-xs font-semibold ${getSeverityClassName(
                        alert.severity,
                      )}`}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{alert.title}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {alert.plate}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {alert.dueDate ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-[var(--on-surface-variant)]">
                    {alert.detail}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-sm font-semibold text-[var(--on-surface-variant)]"
                    colSpan={5}
                  >
                    Uyarı bulunamadı.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="border-b border-[var(--grid-border)] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold">Arvento Araç Takip Listesi</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
                {activeVehicleSearchTerm
                  ? `${filteredRows.length} / ${rows.length} araç`
                  : `Son ${rows.length} araç`}
              </span>
              {activeVehicleSearchTerm ? (
                <button
                  aria-label="Aktif araç aramasını temizle"
                  className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface)]"
                  onClick={clearActiveVehicleSearch}
                  type="button"
                >
                  Aktif Aramayı Temizle
                </button>
              ) : null}
              <label className="flex w-full flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)] md:max-w-sm">
                Aktif araçlarda ara
                <input
                  className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                  onChange={(event) => setActiveVehicleSearch(event.target.value)}
                  placeholder="Plaka, araç, şantiye, sürücü, konum"
                  type="search"
                  value={activeVehicleSearch}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table
            aria-label="P2 Arvento Araç Takip Listesi"
            className="min-w-[1460px] w-full text-left text-sm"
          >
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Plaka</th>
                <th className="px-4 py-3 font-semibold">Araç</th>
                <th className="px-4 py-3 font-semibold">Şantiye</th>
                <th className="px-4 py-3 font-semibold">Sürücü</th>
                <th className="px-4 py-3 font-semibold">Durum</th>
                <th className="px-4 py-3 font-semibold">Konum</th>
                <th className="px-4 py-3 font-semibold">Son Sinyal</th>
                <th className="px-4 py-3 font-semibold">Yakıt Türü</th>
                <th className="px-4 py-3 font-semibold">Şase No</th>
                <th className="px-4 py-3 font-semibold">Motor No</th>
                <th className="px-4 py-3 font-semibold">Giriş KM</th>
                <th className="px-4 py-3 font-semibold">A.Tarihi</th>
                <th className="px-4 py-3 font-semibold">S.Tarihi</th>
                <th className="px-4 py-3 font-semibold">Sigorta Bit.</th>
                <th className="px-4 py-3 font-semibold">Muay. Bit.</th>
                <th className="px-4 py-3 font-semibold">Bakım</th>
                <th className="px-4 py-3 font-semibold">Tescil</th>
                <th className="px-4 py-3 font-semibold">Yakıt</th>
                <th className="px-4 py-3 font-semibold">KM</th>
                <th className="px-4 py-3 font-semibold">Bakım</th>
                {updateVehicleCard || deactivateVehicleCard ? (
                  <th className="px-4 py-3 font-semibold">İşlem</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {row.plate}
                  </td>
                  <td className="px-4 py-3">{row.vehicleLabel}</td>
                  <td className="px-4 py-3">{row.siteName}</td>
                  <td className="px-4 py-3">{row.driverName}</td>
                  <td className="px-4 py-3">{row.statusLabel}</td>
                  <td className="px-4 py-3">{row.locationLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateTime(row.lastSeenAt)}
                  </td>
                  <td className="px-4 py-3">
                    {vehicleCardsById.get(row.id)?.fuelType || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.chassisNumber || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.engineNumber || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {(vehicleCardsById.get(row.id)?.entryOdometerKm ?? 0) > 0
                      ? formatNumber(
                          vehicleCardsById.get(row.id)?.entryOdometerKm ?? 0,
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.acquisitionDate
                      ? formatDateOnly(
                          vehicleCardsById.get(row.id)?.acquisitionDate ?? "",
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.dispositionDate
                      ? formatDateOnly(
                          vehicleCardsById.get(row.id)?.dispositionDate ?? "",
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.insuranceEndDate
                      ? formatDateOnly(
                          vehicleCardsById.get(row.id)?.insuranceEndDate ?? "",
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.inspectionEndDate
                      ? formatDateOnly(
                          vehicleCardsById.get(row.id)?.inspectionEndDate ?? "",
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.maintenanceDueDate
                      ? formatDateOnly(
                          vehicleCardsById.get(row.id)?.maintenanceDueDate ?? "",
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {vehicleCardsById.get(row.id)?.registrationDate
                      ? formatDateOnly(
                          vehicleCardsById.get(row.id)?.registrationDate ?? "",
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {row.fuelLevelPercent}%
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatNumber(row.odometerKm)}
                  </td>
                  <td className="px-4 py-3">{row.maintenanceStatusLabel}</td>
                  {updateVehicleCard || deactivateVehicleCard ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {updateVehicleCard && vehicleCardsById.has(row.id) ? (
                          <button
                            aria-label={`${row.plate} düzenle`}
                            className="min-h-8 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isPending}
                            onClick={() =>
                              handleVehicleCardEdit(vehicleCardsById.get(row.id)!)
                            }
                            type="button"
                          >
                            Düzenle
                          </button>
                        ) : null}
                        {deactivateVehicleCard ? (
                          <button
                            aria-label={`${row.plate} pasife al`}
                            className="min-h-8 rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isPending}
                            onClick={() =>
                              handleDeactivateVehicleCardRequest({
                                id: row.id,
                                plate: row.plate,
                                siteName: row.siteName,
                                vehicleLabel: row.vehicleLabel,
                              })
                            }
                            type="button"
                          >
                            Pasife Al
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-sm font-semibold text-[var(--on-surface-variant)]"
                    colSpan={updateVehicleCard || deactivateVehicleCard ? 21 : 20}
                  >
                    Aktif araç bulunamadı.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Araç İşlem Geçmişi</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
                {hasActiveAuditFilter
                  ? `${filteredAuditEntries.length} / ${auditEntries.length} işlem`
                  : `Son ${auditEntries.length} işlem`}
              </span>
              {hasActiveAuditFilter ? (
                <button
                  className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface)]"
                  onClick={clearAuditFilters}
                  type="button"
                >
                  Filtreleri Temizle
                </button>
              ) : null}
              {filteredAuditEntries.length > 0 ? (
                <a
                  className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface)]"
                  download={buildVehicleAuditCsvFileName()}
                  href={buildVehicleAuditCsvHref(filteredAuditEntries)}
                >
                  CSV Dışa Aktar
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--on-surface-variant)] opacity-60"
                >
                  CSV Dışa Aktar
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)]">
              Plakaya göre filtrele
              <input
                className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                onChange={(event) => setAuditPlateFilter(event.target.value)}
                placeholder="Örn. 34 NOA"
                type="search"
                value={auditPlateFilter}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)]">
              İşleme göre filtrele
              <select
                className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                onChange={(event) => setAuditActionFilter(event.target.value)}
                value={auditActionFilter}
              >
                <option value="">Tüm işlemler</option>
                {auditActionOptions.map((action) => (
                  <option key={action} value={action}>
                    {formatVehicleAuditAction(action)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)]">
              Kullanıcıya göre filtrele
              <input
                className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                onChange={(event) => setAuditUserFilter(event.target.value)}
                placeholder="Kullanıcı kimliği"
                type="search"
                value={auditUserFilter}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)]">
              Başlangıç tarihi
              <input
                className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                onChange={(event) => setAuditStartDate(event.target.value)}
                type="date"
                value={auditStartDate}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)]">
              Bitiş tarihi
              <input
                className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                onChange={(event) => setAuditEndDate(event.target.value)}
                type="date"
                value={auditEndDate}
              />
            </label>
          </div>
          {hasInvalidAuditDateRange ? (
            <p className="text-sm font-semibold text-red-700" role="alert">
              Başlangıç tarihi bitiş tarihinden sonra olamaz.
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table
            aria-label="P2 Araç İşlem Geçmişi"
            className="min-w-[860px] w-full text-left text-sm"
          >
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Zaman</th>
                <th className="px-4 py-3 font-semibold">Plaka</th>
                <th className="px-4 py-3 font-semibold">İşlem</th>
                <th className="px-4 py-3 font-semibold">Son Durum</th>
                <th className="px-4 py-3 font-semibold">Değişiklikler</th>
                <th className="px-4 py-3 font-semibold">Kullanıcı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {filteredAuditEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateTime(entry.occurredAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {entry.entityLabel}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatVehicleAuditAction(entry.action)}
                  </td>
                  <td className="px-4 py-3">
                    {getVehicleAuditStatus(entry.metadata)}
                  </td>
                  <td className="px-4 py-3 text-[var(--on-surface-variant)]">
                    {getVehicleAuditChanges(entry.metadata)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {entry.actorUserId}
                  </td>
                </tr>
              ))}
              {filteredAuditEntries.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center font-semibold text-[var(--on-surface-variant)]"
                    colSpan={6}
                  >
                    {hasInvalidAuditDateRange
                      ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
                      : hasActiveAuditFilter
                      ? "Filtrelerle eşleşen araç işlemi bulunamadı."
                      : "Araç işlem geçmişi bulunamadı."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      {activationConfirmation ? (
        <div
          aria-labelledby="vehicle-activation-confirmation-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
        >
          <section className="w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5 shadow-xl">
            <h2
              className="text-base font-semibold"
              id="vehicle-activation-confirmation-title"
            >
              Araç aktifleştirme onayı
            </h2>
            <p className="mt-3 text-sm text-[var(--on-surface-variant)]">
              {activationConfirmation.plate} aktifleştirilecek.
            </p>
            <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm">
              <p className="font-semibold">{activationConfirmation.vehicleLabel}</p>
              <p className="mt-1 text-[var(--on-surface-variant)]">
                {activationConfirmation.siteName}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold text-[var(--on-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={() => setActivationConfirmation(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="min-h-9 rounded-[var(--radius-control)] bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={handleActivateVehicleCardConfirm}
                type="button"
              >
                Aktifleştir
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {deactivationConfirmation ? (
        <div
          aria-labelledby="vehicle-deactivation-confirmation-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
        >
          <section className="w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5 shadow-xl">
            <h2
              className="text-base font-semibold"
              id="vehicle-deactivation-confirmation-title"
            >
              Araç pasife alma onayı
            </h2>
            <p className="mt-3 text-sm text-[var(--on-surface-variant)]">
              {deactivationConfirmation.plate} pasife alınacak.
            </p>
            <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm">
              <p className="font-semibold">{deactivationConfirmation.vehicleLabel}</p>
              <p className="mt-1 text-[var(--on-surface-variant)]">
                {deactivationConfirmation.siteName}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="min-h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold text-[var(--on-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={() => setDeactivationConfirmation(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="min-h-9 rounded-[var(--radius-control)] bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={handleDeactivateVehicleCardConfirm}
                type="button"
              >
                Pasife Al
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}


const multiWordVehicleBrands = ["Mercedes Benz", "Land Rover", "New Holland"];

function getVehicleDriverSuggestions(
  rows: ArventoVehicleFleetOverview["rows"],
  vehicleCards: VehicleCardRow[],
) {
  return buildSuggestionList([
    ...rows.map((row) => row.driverName),
    ...vehicleCards.map((card) => card.driverName),
  ]).filter(
    (driverName) =>
      driverName.toLocaleLowerCase("tr-TR") !==
      "Atanmamış".toLocaleLowerCase("tr-TR"),
  );
}

function getVehicleFuelTypeSuggestions(vehicleCards: VehicleCardRow[]) {
  return buildSuggestionList([
    "Benzin",
    "Dizel",
    "Elektrik",
    "Hibrit",
    "LPG",
    ...vehicleCards.map((card) => card.fuelType ?? ""),
  ]);
}

function getVehicleModelSuggestions(
  rows: ArventoVehicleFleetOverview["rows"],
  vehicleCards: VehicleCardRow[],
) {
  return buildSuggestionList([
    ...rows.map((row) => parseVehicleLabelDetails(row.vehicleLabel).modelName),
    ...vehicleCards.map((card) => card.modelName),
  ]);
}

function getVehicleBrandSuggestions(
  rows: ArventoVehicleFleetOverview["rows"],
  vehicleCards: VehicleCardRow[],
) {
  return buildSuggestionList([
    ...rows.map((row) => parseVehicleLabelDetails(row.vehicleLabel).brand),
    ...vehicleCards.map((card) => card.brand),
  ]);
}

function parseVehicleLabelDetails(vehicleLabel: string) {
  const details = vehicleLabel.split(" / ")[1]?.trim() ?? "";
  const parts = details.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return { brand: "", modelName: "" };
  }

  const normalizedDetails = details.toLocaleLowerCase("tr-TR");
  const matchedBrand = multiWordVehicleBrands.find((brand) =>
    normalizedDetails.startsWith(brand.toLocaleLowerCase("tr-TR")),
  );
  const brandParts = matchedBrand ? matchedBrand.split(" ") : [parts[0]];
  const modelParts = parts.slice(brandParts.length);

  if (/^\d{4}$/.test(modelParts.at(-1) ?? "")) {
    modelParts.pop();
  }

  return {
    brand: matchedBrand ?? parts[0],
    modelName: modelParts.join(" "),
  };
}

function getVehicleTypeSuggestions(
  rows: ArventoVehicleFleetOverview["rows"],
  vehicleCards: VehicleCardRow[],
) {
  return buildSuggestionList([
    ...rows.map((row) => row.vehicleLabel.split(" / ")[0]),
    ...vehicleCards.map((card) => card.vehicleType),
  ]);
}

function getVehicleSiteSuggestions(
  rows: ArventoVehicleFleetOverview["rows"],
  vehicleCards: VehicleCardRow[],
) {
  return buildSuggestionList([
    ...rows.map((row) => row.siteName),
    ...vehicleCards.map((card) => card.siteName),
  ]);
}

function buildSuggestionList(values: string[]) {
  const suggestions = new Map<string, string>();

  for (const value of values) {
    const suggestion = value.trim();

    if (!suggestion) {
      continue;
    }

    const key = suggestion.toLocaleLowerCase("tr-TR");

    if (!suggestions.has(key)) {
      suggestions.set(key, suggestion);
    }
  }

  return Array.from(suggestions.values()).sort((first, second) =>
    first.localeCompare(second, "tr"),
  );
}

function getPassiveVehicleSearchText(vehicleCard: VehicleCardRow) {
  return [
    vehicleCard.acquisitionDate,
    vehicleCard.dispositionDate,
    vehicleCard.insuranceEndDate,
    vehicleCard.inspectionEndDate,
    vehicleCard.maintenanceDueDate,
    vehicleCard.registrationDate,
    vehicleCard.plate,
    formatVehicleCardLabel(vehicleCard),
    vehicleCard.siteName,
    vehicleCard.driverName,
    vehicleCard.fuelType,
    vehicleCard.chassisNumber,
    vehicleCard.engineNumber,
    vehicleCard.entryOdometerKm,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}
function getVehicleAlertSearchText(alert: ArventoVehicleFleetOverview["alerts"][number]) {
  return [
    alert.severity,
    alert.title,
    alert.plate,
    alert.dueDate,
    alert.detail,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}

function getVehicleAlertType(
  alert: ArventoVehicleFleetOverview["alerts"][number],
): VehicleAlertTypeFilter {
  if (alert.title === "Sigorta süresi yaklaşıyor") return "insurance";
  if (alert.title === "Muayene süresi yaklaşıyor") return "inspection";
  if (alert.title === "Sinyal yok") return "signal";
  if (alert.title === "Yaklaşan bakım") return "maintenance";
  return "fuel";
}

function getActiveVehicleSearchText(
  row: ArventoVehicleFleetOverview["rows"][number],
  vehicleCardsById: Map<string, VehicleCardRow>,
) {
  const vehicleCard = vehicleCardsById.get(row.id);

  return [
    row.plate,
    row.vehicleLabel,
    row.siteName,
    row.driverName,
    row.locationLabel,
    row.statusLabel,
    row.maintenanceStatusLabel,
    vehicleCard?.acquisitionDate,
    vehicleCard?.dispositionDate,
    vehicleCard?.insuranceEndDate,
    vehicleCard?.inspectionEndDate,
    vehicleCard?.maintenanceDueDate,
    vehicleCard?.registrationDate,
    vehicleCard?.fuelType,
    vehicleCard?.chassisNumber,
    vehicleCard?.engineNumber,
    vehicleCard?.entryOdometerKm,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}
function formatVehicleCardLabel(vehicleCard: VehicleCardRow) {
  const details = [
    vehicleCard.brand,
    vehicleCard.modelName,
    vehicleCard.modelYear > 0 ? String(vehicleCard.modelYear) : "",
  ].filter(Boolean);

  return details.length > 0
    ? `${vehicleCard.vehicleType} / ${details.join(" ")}`
    : vehicleCard.vehicleType;
}
function VehicleTextField({
  disabled,
  inputMode,
  label,
  listId,
  maxLength,
  name,
  onChange,
  pattern,
  type = "text",
  value,
}: {
  disabled?: boolean;
  inputMode?: "numeric";
  label: string;
  listId?: string;
  maxLength?: number;
  name: keyof VehicleCardFormState;
  onChange: (value: string) => void;
  pattern?: string;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)]">
      <span>{label}</span>
      <input
        className="min-h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold text-[var(--on-surface)] outline-none transition focus:border-[var(--primary)] focus:bg-[var(--surface-container-lowest)]"
        disabled={disabled}
        inputMode={inputMode}
        list={listId}
        maxLength={maxLength}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        pattern={pattern}
        type={type}
        value={value}
      />
    </label>
  );
}

function normalizeVehicleAuditFilter(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replaceAll("ı", "i");
}

function getVehicleAuditLocalDateKey(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSeverityClassName(severity: "Kritik" | "Uyarı" | "Bilgi") {
  if (severity === "Kritik") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "Uyarı") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <h2 className="text-sm font-semibold text-[var(--on-surface-variant)]">
        {label}
      </h2>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </article>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}






























