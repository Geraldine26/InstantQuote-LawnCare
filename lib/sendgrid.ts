import sgMail from "@sendgrid/mail";

interface SendQuoteEmailsInput {
  customerEmail: string;
  customerSubject: string;
  customerHtml: string;
  ownerSubject: string;
  ownerHtml: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let sendGridConfigured = false;

function ensureConfigured() {
  if (sendGridConfigured) {
    return;
  }

  const apiKey = getRequiredEnv("SENDGRID_API_KEY");
  sgMail.setApiKey(apiKey);
  sendGridConfigured = true;
}

export async function sendQuoteEmails(input: SendQuoteEmailsInput) {
  ensureConfigured();

  const fromEmail = getRequiredEnv("SENDGRID_FROM_EMAIL");
  const ownerEmail = getRequiredEnv("OWNER_EMAIL");

  await Promise.all([
    sgMail.send({
      to: input.customerEmail,
      from: fromEmail,
      subject: input.customerSubject,
      html: input.customerHtml,
    }),
    sgMail.send({
      to: ownerEmail,
      from: fromEmail,
      subject: input.ownerSubject,
      html: input.ownerHtml,
    }),
  ]);
}
