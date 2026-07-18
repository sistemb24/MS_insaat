import { describe, expect, test } from "vitest";

import { createEmailOutboxPrismaRepository } from "./email-outbox-prisma-repository";
import type { EmailOutboxMessageInput } from "./email-outbox";

const message: EmailOutboxMessageInput = {
  bodyText: "Davet bağlantısı: http://localhost:3000/davet?token=invite-token",
  channel: "email",
  companyId: "company-demo-insaat",
  createdAt: "2026-07-02T10:00:00.000Z",
  id: "email-outbox-1",
  metadata: {
    action: "create",
    invitationId: "invite-1",
    inviteUrl: "http://localhost:3000/davet?token=invite-token",
  },
  periodId: "period-2026",
  recipientEmail: "isg@example.com",
  status: "pending",
  subject: "NOA İnşaat kullanıcı daveti",
  template: "user-invitation-create",
  tenantId: "tenant-noa-demo",
};

describe("email outbox prisma repository", () => {
  test("enqueues an email outbox message as a pending row", async () => {
    const calls: unknown[] = [];
    const repository = createEmailOutboxPrismaRepository({
      emailOutbox: {
        async create(input) {
          calls.push(input);
        },
      },
    });

    await repository.enqueue(message);

    expect(calls).toEqual([
      {
        data: {
          ...message,
          createdAt: new Date("2026-07-02T10:00:00.000Z"),
        },
      },
    ]);
  });
});
