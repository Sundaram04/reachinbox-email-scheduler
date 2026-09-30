import { EmailList } from "@/components/email/EmailList";

export const metadata = { title: "Sent" };

export default function SentPage() {
  return (
    <>
      <h1 className="sr-only">Sent emails</h1>
      <EmailList />
    </>
  );
}
