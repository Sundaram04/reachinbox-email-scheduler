import { EmailList } from "@/components/email/EmailList";

export const metadata = { title: "Scheduled" };

export default function ScheduledPage() {
  return (
    <>
      <h1 className="sr-only">Scheduled emails</h1>
      <EmailList />
    </>
  );
}
