export const HR_DASHBOARD_LIST_LIMIT = 12;
export const HR_DASHBOARD_WINDOW_DAYS = 30;

export type HrDashboardPersonnelSource = {
  code: string;
  name: string;
  site: string;
  status: string;
};
export type HrDashboardLeaveSource = {
  endDate: string;
  id: string;
  leaveType: string;
  personnelCode: string;
  personnelName: string;
  startDate: string;
  status: string;
};
export type HrDashboardAdvanceSource = {
  id: string;
  personnelCode: string;
  personnelName: string;
  requestDate: string;
  status: string;
};
export type HrDashboardTransferSource = {
  effectiveDate: string;
  id: string;
  personnelCode: string;
  personnelName: string;
  status: string;
};
export type HrDashboardTrainingSource = {
  id: string;
  name: string;
  nextTrainingOn: string | null;
  status: string;
  trainingOn: string;
  type: string;
};
export type HrDashboardTrainingAttendanceSource = {
  trainingId: string;
};
export type HrDashboardTimesheetSource = {
  documentNo: string;
  id: string;
  lineCount: number;
  month: number;
  siteName: string;
  status: string;
  year: number;
};
export type HrDashboardSources = {
  advances: HrDashboardAdvanceSource[];
  leaves: HrDashboardLeaveSource[];
  personnel: HrDashboardPersonnelSource[];
  timesheets: HrDashboardTimesheetSource[];
  trainingAttendances: HrDashboardTrainingAttendanceSource[];
  trainings: HrDashboardTrainingSource[];
  transfers: HrDashboardTransferSource[];
};

export type HrDashboardWorkItem = {
  date: string;
  href: string;
  id: string;
  kind: "advance" | "leave" | "transfer";
  personnelCode: string;
  personnelName: string;
  status: string;
};
export type HrDashboardSnapshot = {
  asOfDate: string;
  draftTimesheets: Array<{
    documentNo: string;
    href: "/puantaj";
    id: string;
    lineCount: number;
    month: number;
    siteName: string;
    year: number;
  }>;
  personnel: {
    active: number;
    onLeaveToday: number;
    passive: number;
    total: number;
  };
  siteDistribution: Array<{
    count: number;
    percentage: number;
    siteName: string;
  }>;
  upcomingLeaves: Array<{
    endDate: string;
    href: string;
    id: string;
    leaveType: string;
    personnelCode: string;
    personnelName: string;
    startDate: string;
  }>;
  upcomingTrainings: Array<{
    attendanceCount: number;
    date: string;
    href: "/isg";
    id: string;
    name: string;
    status: string;
    type: string;
  }>;
  windowEndDate: string;
  workItems: HrDashboardWorkItem[];
  workQueue: {
    advanceFinance: number;
    advanceManager: number;
    advancePayment: number;
    advanceReceivable: number;
    leave: number;
    total: number;
    transfer: number;
  };
};

export function buildHrDashboardSnapshot(input: {
  asOfDate: string;
  sources: HrDashboardSources;
}): HrDashboardSnapshot {
  const asOfDate = dateOnly(input.asOfDate, "Dashboard tarihi");
  const windowEndDate = addDays(asOfDate, HR_DASHBOARD_WINDOW_DAYS);
  const activePersonnel = input.sources.personnel.filter((row) =>
    canonical(row.status) === "AKTİF");
  const activeCodes = new Set(activePersonnel.map((row) => canonical(row.code)));
  const onLeaveToday = new Set(
    input.sources.leaves
      .filter((row) =>
        row.status === "APPROVED"
        && row.startDate <= asOfDate
        && row.endDate >= asOfDate
        && activeCodes.has(canonical(row.personnelCode)))
      .map((row) => canonical(row.personnelCode)),
  ).size;

  const siteCounts = new Map<string, { count: number; label: string }>();
  for (const row of activePersonnel) {
    const label = normalize(row.site) || "Şantiye atanmamış";
    const key = canonical(label);
    const current = siteCounts.get(key);
    siteCounts.set(key, {
      count: (current?.count ?? 0) + 1,
      label: current?.label ?? label,
    });
  }
  const siteDistribution = [...siteCounts.values()]
    .map((row) => ({
      count: row.count,
      percentage: activePersonnel.length
        ? Math.round((row.count / activePersonnel.length) * 1000) / 10
        : 0,
      siteName: row.label,
    }))
    .sort((left, right) =>
      right.count - left.count
      || left.siteName.localeCompare(right.siteName, "tr"));

  const upcomingLeaves = input.sources.leaves
    .filter((row) =>
      row.status === "APPROVED"
      && row.startDate >= asOfDate
      && row.startDate <= windowEndDate)
    .sort((left, right) =>
      left.startDate.localeCompare(right.startDate)
      || left.personnelName.localeCompare(right.personnelName, "tr"))
    .slice(0, HR_DASHBOARD_LIST_LIMIT)
    .map((row) => ({
      endDate: row.endDate,
      href: `/personel?leave=${encodeURIComponent(row.id)}`,
      id: row.id,
      leaveType: row.leaveType,
      personnelCode: row.personnelCode,
      personnelName: row.personnelName,
      startDate: row.startDate,
    }));

  const attendanceCounts = new Map<string, number>();
  for (const row of input.sources.trainingAttendances) {
    attendanceCounts.set(
      row.trainingId,
      (attendanceCounts.get(row.trainingId) ?? 0) + 1,
    );
  }
  const upcomingTrainings = input.sources.trainings
    .map((row) => ({ row, visibleDate: visibleTrainingDate(row, asOfDate, windowEndDate) }))
    .filter((item): item is { row: HrDashboardTrainingSource; visibleDate: string } =>
      Boolean(item.visibleDate))
    .sort((left, right) =>
      left.visibleDate.localeCompare(right.visibleDate)
      || left.row.name.localeCompare(right.row.name, "tr"))
    .slice(0, HR_DASHBOARD_LIST_LIMIT)
    .map(({ row, visibleDate }) => ({
      attendanceCount: attendanceCounts.get(row.id) ?? 0,
      date: visibleDate,
      href: "/isg" as const,
      id: row.id,
      name: row.name,
      status: row.status,
      type: row.type,
    }));

  const draftTimesheets = input.sources.timesheets
    .filter((row) => canonical(row.status) === "TASLAK")
    .sort((left, right) =>
      right.year - left.year
      || right.month - left.month
      || left.documentNo.localeCompare(right.documentNo, "tr"))
    .slice(0, HR_DASHBOARD_LIST_LIMIT)
    .map((row) => ({
      documentNo: row.documentNo,
      href: "/puantaj" as const,
      id: row.id,
      lineCount: row.lineCount,
      month: row.month,
      siteName: row.siteName,
      year: row.year,
    }));

  const workItems = buildWorkItems(input.sources);
  const workQueue = {
    advanceFinance: countStatus(input.sources.advances, "MANAGER_APPROVED"),
    advanceManager: countStatus(input.sources.advances, "SUBMITTED"),
    advancePayment: countStatus(input.sources.advances, "FINANCE_APPROVED"),
    advanceReceivable: countStatus(input.sources.advances, "PAID"),
    leave: countStatus(input.sources.leaves, "SUBMITTED"),
    total: workItems.length,
    transfer: countStatus(input.sources.transfers, "SUBMITTED"),
  };

  return {
    asOfDate,
    draftTimesheets,
    personnel: {
      active: activePersonnel.length,
      onLeaveToday,
      passive: input.sources.personnel.filter((row) =>
        canonical(row.status) === "PASİF").length,
      total: input.sources.personnel.length,
    },
    siteDistribution,
    upcomingLeaves,
    upcomingTrainings,
    windowEndDate,
    workItems: workItems.slice(0, HR_DASHBOARD_LIST_LIMIT),
    workQueue,
  };
}

function buildWorkItems(sources: HrDashboardSources): HrDashboardWorkItem[] {
  return [
    ...sources.leaves
      .filter((row) => row.status === "SUBMITTED")
      .map((row) => ({
        date: row.startDate,
        href: `/personel?leave=${encodeURIComponent(row.id)}`,
        id: row.id,
        kind: "leave" as const,
        personnelCode: row.personnelCode,
        personnelName: row.personnelName,
        status: row.status,
      })),
    ...sources.advances
      .filter((row) =>
        ["SUBMITTED", "MANAGER_APPROVED", "FINANCE_APPROVED", "PAID"]
          .includes(row.status))
      .map((row) => ({
        date: row.requestDate,
        href: `/personel?advance=${encodeURIComponent(row.id)}`,
        id: row.id,
        kind: "advance" as const,
        personnelCode: row.personnelCode,
        personnelName: row.personnelName,
        status: row.status,
      })),
    ...sources.transfers
      .filter((row) => row.status === "SUBMITTED")
      .map((row) => ({
        date: row.effectiveDate,
        href: `/personel?transfer=${encodeURIComponent(row.id)}`,
        id: row.id,
        kind: "transfer" as const,
        personnelCode: row.personnelCode,
        personnelName: row.personnelName,
        status: row.status,
      })),
  ].sort((left, right) =>
    left.date.localeCompare(right.date)
    || left.personnelName.localeCompare(right.personnelName, "tr")
    || left.id.localeCompare(right.id));
}

function visibleTrainingDate(
  row: HrDashboardTrainingSource,
  start: string,
  end: string,
) {
  if (row.status === "PLANNED" && inWindow(row.trainingOn, start, end)) {
    return row.trainingOn;
  }
  if (row.nextTrainingOn && inWindow(row.nextTrainingOn, start, end)) {
    return row.nextTrainingOn;
  }
  return null;
}
function countStatus(rows: Array<{ status: string }>, status: string) {
  return rows.filter((row) => row.status === status).length;
}
function inWindow(value: string, start: string, end: string) {
  return value >= start && value <= end;
}
function addDays(value: string, days: number) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
function dateOnly(value: string, label: string) {
  const normalized = normalize(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} geçersizdir.`);
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`${label} geçersizdir.`);
  }
  return normalized;
}
function normalize(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}
function canonical(value: unknown) {
  return normalize(value).toLocaleUpperCase("tr-TR");
}
