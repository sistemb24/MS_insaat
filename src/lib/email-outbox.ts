export type EmailOutboxMessageInput = {
  bodyText: string;
  channel: "email";
  companyId: string;
  createdAt: string;
  id: string;
  metadata: Record<string, string>;
  periodId: string;
  recipientEmail: string;
  status: "pending";
  subject: string;
  template: string;
  tenantId: string;
};

export type EmailOutboxRepository = {
  enqueue(input: EmailOutboxMessageInput): Promise<void>;
};
