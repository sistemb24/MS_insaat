"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  createSupportTicketAction,
  getSupportTicketThreadAction,
  listSupportTicketsAction,
  replySupportTicketAction,
  transitionSupportTicketAction,
} from "@/app/actions/support-ticket-actions";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from "@/lib/support-ticket";

type TicketList = Extract<
  Awaited<ReturnType<typeof listSupportTicketsAction>>,
  { ok: true }
>["data"]["tickets"];
type TicketThread = Extract<
  Awaited<ReturnType<typeof getSupportTicketThreadAction>>,
  { ok: true }
>["data"];

const inputClass = "min-h-11 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = "min-h-11 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "min-h-11 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function SupportTicketSurface({
  canTransition,
  initialTicketId,
}: {
  canTransition: boolean;
  initialTicketId?: string;
}) {
  const [tickets, setTickets] = useState<TicketList | null>(null);
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState(initialTicketId ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async (ticketId = selectedTicketId) => {
    const listResult = await listSupportTicketsAction();
    if (!listResult.ok) {
      setError(readErrors(listResult));
      return;
    }
    setTickets(listResult.data.tickets);
    if (!ticketId) {
      setThread(null);
      return;
    }
    const threadResult = await getSupportTicketThreadAction(ticketId);
    if (threadResult.ok) setThread(threadResult.data);
    else {
      setThread(null);
      setError(readErrors(threadResult));
    }
  }, [selectedTicketId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => { if (thread) closeRef.current?.focus(); }, [thread]);

  const visibleTickets = useMemo(() => {
    const normalized = query.toLocaleLowerCase("tr-TR");
    return (tickets ?? []).filter((ticket) =>
      (statusFilter === "ALL" || ticket.status === statusFilter)
      && (typeFilter === "ALL" || ticket.type === typeFilter)
      && `${ticket.subject} ${ticket.type} ${ticket.priority} ${ticket.status}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalized));
  }, [query, statusFilter, tickets, typeFilter]);

  const counts = useMemo(() => ({
    open: tickets?.filter((row) => row.status === "OPEN").length ?? 0,
    inProgress: tickets?.filter((row) => row.status === "IN_PROGRESS").length ?? 0,
    resolved: tickets?.filter((row) => row.status === "RESOLVED").length ?? 0,
  }), [tickets]);

  function selectTicket(ticketId: string, opener: HTMLElement) {
    openerRef.current = opener;
    setSelectedTicketId(ticketId);
    setError("");
    window.history.replaceState(null, "", `/destek-merkezi?ticket=${encodeURIComponent(ticketId)}`);
    void refresh(ticketId);
  }

  function closeDrawer() {
    setSelectedTicketId("");
    setThread(null);
    window.history.replaceState(null, "", "/destek-merkezi");
    openerRef.current?.focus();
  }

  function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    startTransition(async () => {
      const result = await createSupportTicketAction({
        initialMessage: value(data, "initialMessage"),
        priority: value(data, "priority") as SupportTicketPriority,
        requestKey: createRequestKey(),
        subject: value(data, "subject"),
        type: value(data, "type") as SupportTicketType,
      });
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      setDialogOpen(false);
      setSelectedTicketId(result.data.ticket.id);
      setNotice(result.data.idempotent ? "Mevcut destek talebi açıldı." : "Destek talebi oluşturuldu.");
      window.history.replaceState(null, "", `/destek-merkezi?ticket=${encodeURIComponent(result.data.ticket.id)}`);
      await refresh(result.data.ticket.id);
    });
  }

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thread) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    startTransition(async () => {
      const result = await replySupportTicketAction({
        body: value(data, "body"),
        requestKey: createRequestKey(),
        ticketId: thread.ticket.id,
      });
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      form.reset();
      setNotice(result.data.idempotent ? "Yanıt daha önce kaydedilmiş." : "Yanıt eklendi.");
      await refresh(thread.ticket.id);
    });
  }

  function transitionStatus(status: SupportTicketStatus) {
    if (!thread) return;
    setError("");
    startTransition(async () => {
      const result = await transitionSupportTicketAction({
        status,
        ticketId: thread.ticket.id,
      });
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      setNotice("Talep durumu güncellendi.");
      await refresh(thread.ticket.id);
    });
  }

  return (
    <section aria-label="Destek Merkezi" className="mx-auto grid max-w-7xl gap-4">
      <header className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Faz 18 · Tenant içi destek</p>
            <h2 className="mt-1 text-xl font-bold text-content">Destek Merkezi</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">Destek talebinizi açın, yazışmayı tek yerde izleyin ve çözüm durumunu takip edin.</p>
          </div>
          <button className={`${primaryButton} print:hidden`} onClick={() => setDialogOpen(true)} type="button">Yeni destek talebi</button>
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric label="Açık" value={counts.open} />
          <Metric emphasis="warning" label="İşlemde" value={counts.inProgress} />
          <Metric emphasis="success" label="Çözüldü" value={counts.resolved} />
        </dl>
      </header>

      <div aria-atomic="true" aria-live="polite">
        {notice ? <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success">{notice}</p> : null}
        {error ? <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{error}</p> : null}
      </div>

      <article className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
        <div className="grid gap-2 border-b border-divider bg-surface-subtle p-3 sm:grid-cols-[minmax(12rem,1fr)_12rem_12rem] print:hidden">
          <input aria-label="Destek taleplerinde ara" className={inputClass} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Konu, tür veya durum ara" value={query} />
          <select aria-label="Duruma göre filtrele" className={inputClass} onChange={(event) => setStatusFilter(event.currentTarget.value)} value={statusFilter}>
            <option value="ALL">Tüm durumlar</option>
            <option value="OPEN">Açık</option><option value="IN_PROGRESS">İşlemde</option><option value="RESOLVED">Çözüldü</option><option value="CLOSED">Kapatıldı</option>
          </select>
          <select aria-label="Türe göre filtrele" className={inputClass} onChange={(event) => setTypeFilter(event.currentTarget.value)} value={typeFilter}>
            <option value="ALL">Tüm türler</option>
            <option value="TECHNICAL">Teknik</option><option value="ACCOUNT">Hesap</option><option value="BILLING">Faturalama</option><option value="SUGGESTION">Öneri</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table aria-label="Destek talepleri" className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-3 py-3">Konu</th><th className="px-3 py-3">Tür</th><th className="px-3 py-3">Öncelik</th><th className="px-3 py-3">Durum</th><th className="px-3 py-3">Son hareket</th><th className="px-3 py-3 print:hidden">Detay</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {!tickets ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={6}>Destek talepleri yükleniyor…</td></tr> : null}
              {tickets && visibleTickets.length === 0 ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={6}>Bu filtrede destek talebi bulunmuyor.</td></tr> : null}
              {visibleTickets.map((ticket) => <tr className={ticket.id === selectedTicketId ? "bg-brand-primary/5" : ""} key={ticket.id}><td className="px-3 py-3"><strong className="block text-content">{ticket.subject}</strong><span className="text-xs text-content-muted">{ticket.id}</span></td><td className="px-3 py-3 text-content">{typeLabel(ticket.type)}</td><td className="px-3 py-3"><PriorityBadge priority={ticket.priority} /></td><td className="px-3 py-3"><StatusBadge status={ticket.status} /></td><td className="px-3 py-3 font-mono text-xs text-content">{formatDateTime(ticket.lastMessageAt)}</td><td className="px-3 py-3 print:hidden"><button className={secondaryButton} onClick={(event) => selectTicket(ticket.id, event.currentTarget)} type="button">Aç</button></td></tr>)}
            </tbody>
          </table>
        </div>
      </article>

      {thread ? <ThreadDrawer canTransition={canTransition} closeRef={closeRef} onClose={closeDrawer} onReply={submitReply} onTransition={transitionStatus} pending={pending} thread={thread} /> : null}
      {dialogOpen ? <TicketDialog onCancel={() => setDialogOpen(false)} onSubmit={submitTicket} pending={pending} /> : null}
    </section>
  );
}

function ThreadDrawer({ canTransition, closeRef, onClose, onReply, onTransition, pending, thread }: { canTransition: boolean; closeRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void; onReply: (event: FormEvent<HTMLFormElement>) => void; onTransition: (status: SupportTicketStatus) => void; pending: boolean; thread: TicketThread }) {
  const nextStatus = ({ OPEN: "IN_PROGRESS", IN_PROGRESS: "RESOLVED", RESOLVED: "CLOSED", CLOSED: null } as const)[thread.ticket.status];
  return <div aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-content/45 p-0 sm:p-4 print:static print:bg-transparent" onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }} role="dialog"><article aria-labelledby="support-thread-title" className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-2xl sm:rounded-ui-panel sm:border sm:border-divider sm:p-5 print:max-w-none print:shadow-none"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">{typeLabel(thread.ticket.type)} · {priorityLabel(thread.ticket.priority)}</p><h2 className="mt-1 text-xl font-bold text-content" id="support-thread-title">{thread.ticket.subject}</h2><div className="mt-2"><StatusBadge status={thread.ticket.status} /></div></div><button aria-label="Destek talebi detayını kapat" className={`${secondaryButton} print:hidden`} disabled={pending} onClick={onClose} ref={closeRef} type="button">Kapat</button></div><ol aria-label="Destek yazışmaları" className="mt-5 space-y-3">{thread.messages.map((message) => <li className="rounded-ui-panel border border-divider bg-surface-subtle p-4" key={message.id}><div className="flex flex-wrap justify-between gap-2 text-xs text-content-muted"><strong className="text-content">{message.authorUserId === thread.ticket.requesterUserId ? "Talep sahibi" : "Destek yöneticisi"}</strong><time className="font-mono">{formatDateTime(message.createdAt)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-content">{message.body}</p></li>)}</ol>{thread.messages.length === 0 ? <p className="mt-5 rounded-ui-control border border-dashed border-divider p-4 text-sm text-content-muted">Bu talepte görünür mesaj bulunmuyor.</p> : null}{thread.ticket.status !== "CLOSED" ? <form className="mt-5 rounded-ui-panel border border-divider p-4 print:hidden" onSubmit={onReply}><label className="text-sm font-semibold text-content" htmlFor="support-reply-body">Yanıtınız</label><textarea className={`${inputClass} mt-2`} id="support-reply-body" maxLength={4000} name="body" required rows={4} /><div className="mt-3 flex flex-wrap justify-end gap-2">{canTransition && nextStatus ? <button className={secondaryButton} disabled={pending} onClick={() => onTransition(nextStatus)} type="button">{statusTransitionLabel(nextStatus)}</button> : null}<button className={primaryButton} disabled={pending} type="submit">{pending ? "Gönderiliyor…" : "Yanıt gönder"}</button></div></form> : <p className="mt-5 rounded-ui-control border border-divider bg-surface-subtle p-4 text-sm font-semibold text-content-muted">Bu destek talebi kapatılmıştır; yeni yanıt eklenemez.</p>}</article></div>;
}

function TicketDialog({ onCancel, onSubmit, pending }: { onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-content/45 p-4 print:hidden" role="dialog"><form aria-labelledby="support-ticket-form-title" className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl" onSubmit={onSubmit}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Yeni talep</p><h2 className="mt-1 text-lg font-bold text-content" id="support-ticket-form-title">Destek talebi oluştur</h2></div><button aria-label="Destek talebi formunu kapat" className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Kapat</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field full label="Konu"><input className={inputClass} maxLength={200} name="subject" required /></Field><Field label="Talep türü"><select className={inputClass} defaultValue="TECHNICAL" name="type"><option value="TECHNICAL">Teknik</option><option value="ACCOUNT">Hesap</option><option value="BILLING">Faturalama</option><option value="SUGGESTION">Öneri</option></select></Field><Field label="Öncelik"><select className={inputClass} defaultValue="NORMAL" name="priority"><option value="LOW">Düşük</option><option value="NORMAL">Normal</option><option value="HIGH">Yüksek</option></select></Field><Field full label="Açıklama"><textarea aria-describedby="support-message-help" className={inputClass} maxLength={4000} name="initialMessage" required rows={7} /></Field><p className="text-xs leading-5 text-content-muted sm:col-span-2" id="support-message-help">Kişisel, finansal veya sağlıkla ilgili hassas bilgileri gereksiz yere paylaşmayın.</p></div><div className="mt-5 flex justify-end gap-2"><button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Vazgeç</button><button className={primaryButton} disabled={pending} type="submit">{pending ? "Oluşturuluyor…" : "Talebi oluştur"}</button></div></form></div>;
}

function Field({ children, full = false, label }: { children: React.ReactNode; full?: boolean; label: string }) { return <label className={full ? "grid gap-1 text-sm font-semibold text-content sm:col-span-2" : "grid gap-1 text-sm font-semibold text-content"}>{label}{children}</label>; }
function Metric({ emphasis, label, value }: { emphasis?: "success" | "warning"; label: string; value: number }) { return <div className="rounded-ui-control border border-divider bg-surface-subtle p-3"><dt className="text-xs font-semibold text-content-muted">{label}</dt><dd className={emphasis === "warning" ? "mt-1 font-mono text-lg font-bold text-warning" : emphasis === "success" ? "mt-1 font-mono text-lg font-bold text-success" : "mt-1 font-mono text-lg font-bold text-content"}>{value}</dd></div>; }
function StatusBadge({ status }: { status: SupportTicketStatus }) { const styles = status === "CLOSED" ? "bg-surface-muted text-content-muted" : status === "RESOLVED" ? "bg-success-subtle text-success" : status === "IN_PROGRESS" ? "bg-warning-subtle text-warning" : "bg-brand-primary/10 text-brand-primary"; return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{statusLabel(status)}</span>; }
function PriorityBadge({ priority }: { priority: SupportTicketPriority }) { const styles = priority === "HIGH" ? "bg-danger-subtle text-danger" : priority === "LOW" ? "bg-surface-muted text-content-muted" : "bg-brand-primary/10 text-brand-primary"; return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{priorityLabel(priority)}</span>; }
function statusLabel(status: SupportTicketStatus) { return ({ OPEN: "Açık", IN_PROGRESS: "İşlemde", RESOLVED: "Çözüldü", CLOSED: "Kapatıldı" } as const)[status]; }
function statusTransitionLabel(status: SupportTicketStatus) { return ({ OPEN: "Aç", IN_PROGRESS: "İşleme al", RESOLVED: "Çözüldü olarak işaretle", CLOSED: "Talebi kapat" } as const)[status]; }
function priorityLabel(priority: SupportTicketPriority) { return ({ LOW: "Düşük", NORMAL: "Normal", HIGH: "Yüksek" } as const)[priority]; }
function typeLabel(type: SupportTicketType) { return ({ TECHNICAL: "Teknik", ACCOUNT: "Hesap", BILLING: "Faturalama", SUGGESTION: "Öneri" } as const)[type]; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function value(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function createRequestKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function readErrors(value: unknown) { return typeof value === "object" && value !== null && "errors" in value && Array.isArray(value.errors) ? value.errors.join(" ") : "İşlem tamamlanamadı."; }
