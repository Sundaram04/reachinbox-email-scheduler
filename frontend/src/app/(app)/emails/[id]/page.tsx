import { EmailDetail } from "@/components/email/EmailDetail";

export const metadata = { title: "Email" };

export default async function EmailDetailPage(
  props: PageProps<"/emails/[id]">,
) {
  const { id } = await props.params;

  return <EmailDetail id={id} />;
}
