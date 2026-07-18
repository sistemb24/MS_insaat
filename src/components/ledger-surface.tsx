"use client";

import { useState } from "react";
import type { LedgerJournalDraft, LedgerJournalRow } from "@/lib/ledger-service";
import { buildLedgerTrialBalance } from "@/lib/ledger-service";
import type { AuditLogEntry } from "@/lib/audit-log";

type LedgerSurfaceProps = {
  entries: LedgerJournalRow[];
  auditEntries: AuditLogEntry[];
  periodClosed: boolean;
  canClosePeriod: boolean;
  onClosePeriod: () => Promise<{ ok: true } | { ok: false; errors: string[] }>;
  onReopenPeriod: () => Promise<{ ok: true } | { ok: false; errors: string[] }>;
  canPost: boolean;
  onPost: (draft: LedgerJournalDraft) => Promise<
    | { ok: true; data: LedgerJournalRow }
    | { ok: false; errors: string[] }
  >;
};

const emptyLines = [
  { accountCode: "100", accountName: "Kasa", amount: "", direction: "debit" as const },
  { accountCode: "320", accountName: "Satıcılar", amount: "", direction: "credit" as const },
];

type LedgerFormLine = (typeof emptyLines)[number];

function createEmptyLedgerLine(): LedgerFormLine {
  return { accountCode: "", accountName: "", amount: "", direction: "debit" };
}

export function LedgerSurface({ entries, auditEntries, periodClosed: initialPeriodClosed, canClosePeriod, onClosePeriod, onReopenPeriod, canPost, onPost }: LedgerSurfaceProps) {
  const [periodClosed, setPeriodClosed] = useState(initialPeriodClosed);
  const [documentNo, setDocumentNo] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState(emptyLines);
  const [notice, setNotice] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const filteredAuditEntries = auditEntries.filter((entry) => entry.entityLabel.toLocaleLowerCase("tr-TR").includes(auditSearch.trim().toLocaleLowerCase("tr-TR")));
  const trialBalance = buildLedgerTrialBalance(entries);
  const trialTotalsByCurrency = ["TL", "USD", "EUR"].map((currency) => {
    const rows = trialBalance.filter((row) => row.currency === currency);
    const debit = rows.reduce((total, row) => total + row.debitTotal, 0);
    const credit = rows.reduce((total, row) => total + row.creditTotal, 0);
    return { currency, debit, credit, balanced: Math.round(debit * 100) === Math.round(credit * 100) };
  }).filter((row) => row.debit !== 0 || row.credit !== 0);
  async function handleClosePeriod() {
    const result = await onClosePeriod();
    if (result.ok) setPeriodClosed(true);
    setNotice(result.ok ? "Dönem kapatıldı. Yeni fiş post edilemez." : result.errors.join(" "));
  }
  async function handleReopenPeriod() {
    const result = await onReopenPeriod();
    if (result.ok) setPeriodClosed(false);
    setNotice(result.ok ? "Dönem yeniden açıldı." : result.errors.join(" "));
  }
  function exportLedgerCsv() {
    const rows = [
      ["Fiş", "Tarih", "Açıklama", "Döviz", "Hesap", "Hesap Adı", "Yön", "Tutar"],
      ...entries.flatMap((entry) => entry.lines.map((line) => [entry.documentNo, entry.entryDate, entry.description, entry.currency, line.accountCode, line.accountName, line.direction, String(line.amount)])),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Ledger CSV dışa aktarımı hazırlandı.");
  }
  function exportTrialBalanceCsv() {
    const rows = [
      ["Döviz", "Hesap", "Hesap Adı", "Borç", "Alacak", "Bakiye"],
      ...trialBalance.map((row) => [row.currency, row.accountCode, row.accountName, row.debitTotal.toFixed(2), row.creditTotal.toFixed(2), row.balance.toFixed(2)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mizan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Mizan CSV dışa aktarımı hazırlandı.");
  }
  function exportAuditCsv() {
    const rows = [["Fiş/Dönem", "İşlem", "Zaman", "Kullanıcı"], ...auditEntries.map((entry) => [entry.entityLabel, entry.action, entry.occurredAt, entry.actorUserId])];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ledger-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Ledger audit CSV dışa aktarımı hazırlandı.");
  }

  async function handleSubmit() {
    const result = await onPost({
      currency: "TL",
      documentNo,
      entryDate,
      description,
      lines: lines.map((line) => ({ ...line, amount: Number(line.amount) })),
    });
    if (!result.ok) {
      setNotice(result.errors.join(" "));
      return;
    }
    setNotice(`Fiş kaydedildi: ${result.data.documentNo}`);
    setDocumentNo("");
    setDescription("");
    setLines(emptyLines);
  }

  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Yevmiye fişleri</h3>
          <p className="text-xs text-[var(--on-surface-variant)]">Kalıcı ledger kayıtları ve manuel dengeli fiş girişi.</p>
        </div>
        <div className="flex items-center gap-2"><button className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold" type="button" onClick={exportLedgerCsv}>Fiş CSV</button><button className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold" type="button" onClick={exportTrialBalanceCsv}>Mizan CSV</button><button className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold" type="button" onClick={exportAuditCsv}>Audit CSV</button><span className="rounded border border-[var(--grid-border)] px-2 py-1 text-xs">{periodClosed ? "Dönem kapalı" : "Dönem açık"}</span>{!periodClosed && canClosePeriod ? <button className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold" type="button" onClick={() => void handleClosePeriod()}>Dönemi kapat</button> : null}{periodClosed && canClosePeriod ? <button className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold" type="button" onClick={() => void handleReopenPeriod()}>Dönemi yeniden aç</button> : null}<span className="text-xs text-[var(--on-surface-variant)]">{entries.length} kayıt</span></div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 py-2 text-sm" placeholder="Fiş no" value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} disabled={!canPost} />
        <input className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 py-2 text-sm" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} disabled={!canPost} />
        <input className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 py-2 text-sm" placeholder="Açıklama" value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canPost} />
      </div>
      <div className="mt-2 grid gap-2">
        {lines.map((line, index) => (
          <div className="grid grid-cols-[110px_1fr_1fr_110px_auto] gap-2" key={index}>
            <select className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-2 text-sm" aria-label={`Satır ${index + 1} yön`} value={line.direction} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, direction: event.target.value as LedgerFormLine["direction"] } : item))} disabled={!canPost}>
              <option value="debit">Borç</option>
              <option value="credit">Alacak</option>
            </select>
            <input className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-2 text-sm" aria-label={`Satır ${index + 1} hesap kodu`} value={line.accountCode} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, accountCode: event.target.value } : item))} disabled={!canPost} />
            <input className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-2 text-sm" aria-label={`Satır ${index + 1} hesap adı`} value={line.accountName} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, accountName: event.target.value } : item))} disabled={!canPost} />
            <input className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-2 text-sm" aria-label={`Satır ${index + 1} tutar`} type="number" min="0" step="0.01" placeholder={line.direction === "debit" ? "Borç" : "Alacak"} value={line.amount} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} disabled={!canPost} />
            <button className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs font-semibold disabled:opacity-50" type="button" aria-label={`Satır ${index + 1} sil`} onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={!canPost || lines.length <= 2}>Sil</button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 py-2 text-sm font-semibold disabled:opacity-50" type="button" onClick={() => setLines((current) => [...current, createEmptyLedgerLine()])} disabled={!canPost || periodClosed}>Satır ekle</button>
        <button className="rounded-[var(--radius-control)] bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => void handleSubmit()} disabled={!canPost || periodClosed}>Fişi kaydet</button>
        {!canPost ? <span className="text-xs text-[var(--on-surface-variant)]">Bu rol fiş post edemez.</span> : null}
        {notice ? <span className="text-xs font-semibold text-[var(--on-surface-variant)]" role="status">{notice}</span> : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-[var(--grid-border)]"><th className="px-2 py-2">Fiş</th><th className="px-2 py-2">Tarih</th><th className="px-2 py-2">Açıklama</th><th className="px-2 py-2 text-right">Toplam</th></tr></thead>
          <tbody>{entries.map((entry) => <tr className="border-b border-[var(--grid-border)] last:border-0" key={entry.id}><td className="px-2 py-2 font-semibold">{entry.documentNo}</td><td className="px-2 py-2">{entry.entryDate}</td><td className="px-2 py-2">{entry.description}</td><td className="px-2 py-2 text-right">{entry.debitTotal.toFixed(2)} {entry.currency}</td></tr>)}</tbody>
        </table>
        {!entries.length ? <p className="py-3 text-xs text-[var(--on-surface-variant)]">Henüz yevmiye fişi yok.</p> : null}
      </div>
      <div className="mt-4 border-t border-[var(--grid-border)] pt-3">
        <h4 className="text-sm font-semibold">Hesap bazlı mizan özeti</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">{trialTotalsByCurrency.map((total) => <div className={`rounded border px-3 py-2 text-xs font-semibold ${total.balanced ? "border-green-200 text-green-700" : "border-red-200 text-red-700"}`} key={total.currency}>{total.currency}: Borç {total.debit.toFixed(2)} · Alacak {total.credit.toFixed(2)} · {total.balanced ? "Dengeli" : "Dengesiz"}</div>)}</div>
        <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[var(--grid-border)]"><th className="px-2 py-2">Hesap</th><th className="px-2 py-2">Döviz</th><th className="px-2 py-2 text-right">Borç</th><th className="px-2 py-2 text-right">Alacak</th><th className="px-2 py-2 text-right">Bakiye</th></tr></thead><tbody>{trialBalance.map((row) => <tr className="border-b border-[var(--grid-border)] last:border-0" key={`${row.currency}-${row.accountCode}`}><td className="px-2 py-2">{row.accountCode} · {row.accountName}</td><td className="px-2 py-2">{row.currency}</td><td className="px-2 py-2 text-right">{row.debitTotal.toFixed(2)}</td><td className="px-2 py-2 text-right">{row.creditTotal.toFixed(2)}</td><td className="px-2 py-2 text-right font-semibold">{row.balance.toFixed(2)}</td></tr>)}</tbody></table></div>
      </div>
      <div className="mt-4 border-t border-[var(--grid-border)] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h4 className="text-sm font-semibold">Ledger post auditleri</h4><p className="text-xs text-[var(--on-surface-variant)]">Başarılı fiş post işlemleri, mevcut dönem kapsamıyla listelenir.</p></div>
          <input aria-label="Ledger audit fiş araması" className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-2 py-1 text-xs" placeholder="Fiş ara" value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} />
        </div>
        <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[var(--grid-border)]"><th className="px-2 py-2">Fiş</th><th className="px-2 py-2">İşlem</th><th className="px-2 py-2">Zaman</th><th className="px-2 py-2">Kullanıcı</th></tr></thead><tbody>{filteredAuditEntries.map((entry) => <tr className="border-b border-[var(--grid-border)] last:border-0" key={entry.id}><td className="px-2 py-2 font-semibold">{entry.entityLabel}</td><td className="px-2 py-2">{entry.action}</td><td className="px-2 py-2">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.occurredAt))}</td><td className="px-2 py-2">{entry.actorUserId}</td></tr>)}</tbody></table></div>
        {!filteredAuditEntries.length ? <p className="py-2 text-xs text-[var(--on-surface-variant)]">Eşleşen ledger audit kaydı yok.</p> : null}
      </div>
    </section>
  );
}
