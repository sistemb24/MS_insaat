import type {
  EmailOutboxMessageInput,
  EmailOutboxRepository,
} from "./email-outbox";

type EmailOutboxClient = {
  create(input: {
    data: Omit<EmailOutboxMessageInput, "createdAt"> & {
      createdAt: Date;
    };
  }): Promise<unknown>;
};

export type EmailOutboxPrismaClientLike = {
  emailOutbox: EmailOutboxClient;
};

export function createEmailOutboxPrismaRepository(
  prisma: EmailOutboxPrismaClientLike,
): EmailOutboxRepository {
  return {
    async enqueue(input) {
      await prisma.emailOutbox.create({
        data: {
          ...input,
          createdAt: new Date(input.createdAt),
        },
      });
    },
  };
}
