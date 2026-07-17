/**
 * Sends a Slack release notification via an Incoming Webhook.
 *
 * Usage: bun run scripts/release-notify.ts
 *
 * Required env vars:
 *   SLACK_WEBHOOK_URL  – Incoming Webhook URL
 *   RELEASE_TAG        – e.g. "v1.2.3"
 *   RELEASE_URL        – URL of the GitHub Release page
 *   RELEASE_NOTES      – Auto-generated release notes body (GitHub Markdown)
 */
import { IncomingWebhook } from "@slack/webhook";
import type { KnownBlock } from "@slack/types";

const MAX_CHARS = 2900; // Slack section block limit is 3000; leave headroom

function mdToMrkdwn(md: string): string {
  return (
    md
      // ## Heading → *Heading*
      .replace(/^#{1,3} (.+)$/gm, "*$1*")
      // **bold** → *bold*
      .replace(/\*\*(.+?)\*\*/g, "*$1*")
      // [label](url) → <url|label>
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>")
      // * bullet → •
      .replace(/^\* /gm, "• ")
      .slice(0, MAX_CHARS)
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const webhookUrl = requireEnv("SLACK_WEBHOOK_URL");
const tag = requireEnv("RELEASE_TAG");
const releaseUrl = requireEnv("RELEASE_URL");
const releaseNotes = requireEnv("RELEASE_NOTES");

const blocks: KnownBlock[] = [
  {
    type: "header",
    text: { type: "plain_text", text: `🚀 observe CLI ${tag} released` },
  },
  {
    type: "section",
    text: { type: "mrkdwn", text: mdToMrkdwn(releaseNotes) },
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "View Release" },
        url: releaseUrl,
        style: "primary",
      },
    ],
  },
];

const webhook = new IncomingWebhook(webhookUrl);
await webhook.send({ blocks });
