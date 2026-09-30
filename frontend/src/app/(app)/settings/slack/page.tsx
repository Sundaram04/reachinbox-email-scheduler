import { SlackPage } from "@/components/slack/SlackPage";

export const metadata = { title: "Slack integration" };

export default async function SlackSettingsPage(
  props: PageProps<"/settings/slack">,
) {
  const { slack, reason } = await props.searchParams;

  return (
    <SlackPage
      result={typeof slack === "string" ? slack : undefined}
      reason={typeof reason === "string" ? reason : undefined}
    />
  );
}
