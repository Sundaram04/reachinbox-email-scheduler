import nodemailer, { type Transporter } from "nodemailer";

import { env } from "../config/env";
import type { SenderSmtpConfig } from "./sender.service";

const transporters = new Map<string, Transporter>();

function getTransporter(sender: SenderSmtpConfig | null) {
  if (env.MAIL_DRY_RUN) {
    let dry = transporters.get("dry-run");

    if (!dry) {
      dry = nodemailer.createTransport({ jsonTransport: true });
      transporters.set("dry-run", dry);
    }

    return dry;
  }

  const config = sender
    ? {
        key: `${sender.id}:${sender.smtpHost}:${sender.smtpPort}:${sender.smtpUser}`,
        host: sender.smtpHost,
        port: sender.smtpPort,
        user: sender.smtpUser,
        pass: sender.smtpPass,
      }
    : {
        key: "env",
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      };

  if (!config.user || !config.pass) {
    throw new Error("SMTP credentials are not configured");
  }

  let transporter = transporters.get(config.key);

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    transporters.set(config.key, transporter);
  }

  return transporter;
}

export async function sendEmail(input: {
  sender: SenderSmtpConfig | null;
  messageId: string;
  to: string;
  subject: string;
  text: string;
}) {
  const info = await getTransporter(input.sender).sendMail({
    from: input.sender?.fromEmail ?? env.SMTP_USER,
    messageId: input.messageId,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
