export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type EmailItem = {
  id: string;
  campaignId: string;
  senderId: string | null;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  attempts: number;
  lastError: string | null;
  previewUrl: string | null;
};

export type EmailDetail = EmailItem & { body: string };

export type EmailScope = "scheduled" | "sent";

export type EmailRowData = Pick<
  EmailItem,
  | "id"
  | "senderId"
  | "toEmail"
  | "subject"
  | "status"
  | "scheduledAt"
  | "sentAt"
>;

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type SearchItem = Omit<
  EmailItem,
  "id" | "attempts" | "lastError" | "previewUrl"
> & {
  emailId: string;
  createdAt: string;
};

export type Sender = {
  id: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  createdAt: string;
};

export type CreateSenderRequest = {
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
};

export type ScheduleRequest = {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  senderIds?: string[];
};

export type ScheduleResponse = {
  campaign: {
    id: string;
    subject: string;
    startTime: string;
    delaySeconds: number;
    hourlyLimit: number;
    createdAt: string;
  };
  scheduledCount: number;
  duplicatesRemoved: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
};

export type SlackStatus =
  | { connected: false }
  | {
      connected: true;
      teamName: string | null;
      channel: string | null;
      connectedAt: string;
    };
