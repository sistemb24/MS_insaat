type LegalDraftNoticeProps = {
  documentName: string;
};

export default function LegalDraftNotice({
  documentName,
}: LegalDraftNoticeProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p
        className="mb-3 text-xs font-bold uppercase tracking-wide"
        style={{ color: "var(--ds-warning)" }}
      >
        Yayına hazır değil
      </p>
      <h1
        className="mb-6 text-3xl font-bold"
        style={{ color: "var(--ds-on-surface)" }}
      >
        {documentName}
      </h1>
      <div
        role="note"
        className="rounded-[var(--ds-radius-panel)] border p-6"
        style={{
          background: "var(--ds-warning-container)",
          borderColor: "var(--ds-warning)",
        }}
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--ds-on-surface)" }}
        >
          Resmi şirket unvanı, veri sorumlusu kimliği, tebligat ve başvuru
          kanalları, production hosting/veri bölgesi, saklama politikası ve
          onaylı hizmet koşulları henüz sağlanmadı. Bu nedenle önceki örnek
          metinler yayınlanmaz ve bu sayfa hukuki taahhüt veya başvuru teslimat
          kanalı sayılmaz.
        </p>
        <p
          className="mt-4 text-sm leading-relaxed"
          style={{ color: "var(--ds-on-surface-variant)" }}
        >
          Onaylı kurumsal kimlik ve hukuk danışmanı girdileri tamamlandığında
          sürümlü metin, yürürlük tarihi ve resmi iletişim kanalı burada
          yayınlanacaktır.
        </p>
      </div>
    </article>
  );
}
