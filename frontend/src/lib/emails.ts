import { api } from "@/lib/api";
import type {
  CreateSenderRequest,
  EmailDetail,
  EmailItem,
  EmailRowData,
  EmailScope,
  EmailStatus,
  Paginated,
  ScheduleRequest,
  ScheduleResponse,
  SearchItem,
  Sender,
} from "@/types/api";

export const PAGE_SIZE = 20;

export const SCOPE_STATUSES: Record<EmailScope, EmailStatus[]> = {
  scheduled: ["scheduled", "processing"],
  sent: ["sent", "failed"],
};

export type EmailQueryParams = {
  scope: EmailScope;
  q: string;
  status: EmailStatus | null;
  page: number;
};

function fromListItem(item: EmailItem): EmailRowData {
  return {
    id: item.id,
    senderId: item.senderId,
    toEmail: item.toEmail,
    subject: item.subject,
    status: item.status,
    scheduledAt: item.scheduledAt,
    sentAt: item.sentAt,
  };
}

function fromSearchItem(item: SearchItem): EmailRowData {
  return {
    id: item.emailId,
    senderId: item.senderId,
    toEmail: item.toEmail,
    subject: item.subject,
    status: item.status,
    scheduledAt: item.scheduledAt,
    sentAt: item.sentAt,
  };
}

export async function fetchEmails(
  { scope, q, status, page }: EmailQueryParams,
  signal: AbortSignal,
): Promise<Paginated<EmailRowData>> {
  const offset = page * PAGE_SIZE;
  const query = { limit: PAGE_SIZE, offset };

  if (!q && !status) {
    const result = await api.get<Paginated<EmailItem>>(`/api/emails/${scope}`, {
      query,
      signal,
    });

    return { ...result, items: result.items.map(fromListItem) };
  }

  const result = await api.get<Paginated<SearchItem>>("/api/emails/search", {
    query: {
      ...query,
      q: q || undefined,
      status: status ?? SCOPE_STATUSES[scope][0],
    },
    signal,
  });

  return { ...result, items: result.items.map(fromSearchItem) };
}

export function fetchEmailDetail(id: string, signal: AbortSignal) {
  return api.get<EmailDetail>(`/api/emails/${id}`, { signal });
}

export async function fetchSenders(signal: AbortSignal) {
  const result = await api.get<{ items: Sender[] }>("/api/senders", { signal });

  return result.items;
}

export function createSender(body: CreateSenderRequest) {
  return api.post<Sender>("/api/senders", body);
}

export function scheduleEmails(body: ScheduleRequest) {
  return api.post<ScheduleResponse>("/api/emails/schedule", body);
}
