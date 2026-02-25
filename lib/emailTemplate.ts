import { formatCurrency } from "@/lib/pricing";
import type { QuoteLineItem } from "@/lib/types";

interface BuildQuoteEmailInput {
  name: string;
  address: string;
  sqft: number;
  preferredDate: string | null;
  services: QuoteLineItem[];
  total: number;
  contactPhone: string;
  customerPhone?: string;
  customerEmail?: string;
  showLeadDetails?: boolean;
}

function sanitize(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildQuoteEmailHtml(input: BuildQuoteEmailInput): string {
  const rows = input.services
    .map((service) => {
      const label = service.frequency ? `${service.label} (${service.frequency === "weekly" ? "Weekly" : "Biweekly"})` : service.label;
      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #374151; color: #e5e7eb; font-family: Arial, sans-serif; font-size: 14px;">${sanitize(label)}</td>
          <td align="right" style="padding: 10px 0; border-bottom: 1px solid #374151; color: #e5e7eb; font-family: Arial, sans-serif; font-size: 14px;">${formatCurrency(service.price)}</td>
        </tr>
      `;
    })
    .join("");

  const leadDetails = input.showLeadDetails
    ? `
      <tr>
        <td style="padding: 6px 0; color: #d1d5db; font-family: Arial, sans-serif; font-size: 14px;"><strong style="color: #ffffff;">Customer Phone:</strong> ${sanitize(input.customerPhone ?? "N/A")}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #d1d5db; font-family: Arial, sans-serif; font-size: 14px;"><strong style="color: #ffffff;">Customer Email:</strong> ${sanitize(input.customerEmail ?? "N/A")}</td>
      </tr>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Instant Quote</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #111827; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #1f2937; border-radius: 12px; border: 1px solid #374151; overflow: hidden;">
            <tr>
              <td style="padding: 24px;">
                <h1 style="margin: 0 0 16px; color: #ffffff; font-family: Arial, sans-serif; font-size: 24px; line-height: 30px;">Instant Quote Summary</h1>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px; border: 1px solid #374151; border-radius: 8px;">
                  <tr>
                    <td style="padding: 16px;">
                      <h2 style="margin: 0 0 10px; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px;">Property Details</h2>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 6px 0; color: #d1d5db; font-family: Arial, sans-serif; font-size: 14px;"><strong style="color: #ffffff;">Name:</strong> ${sanitize(input.name)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #d1d5db; font-family: Arial, sans-serif; font-size: 14px;"><strong style="color: #ffffff;">Address:</strong> ${sanitize(input.address)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #d1d5db; font-family: Arial, sans-serif; font-size: 14px;"><strong style="color: #ffffff;">Lawn Size:</strong> ${new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(input.sqft)))} sqft</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #d1d5db; font-family: Arial, sans-serif; font-size: 14px;"><strong style="color: #ffffff;">Preferred Date:</strong> ${sanitize(input.preferredDate || "Not provided")}</td>
                        </tr>
                        ${leadDetails}
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px; border: 1px solid #374151; border-radius: 8px;">
                  <tr>
                    <td style="padding: 16px;">
                      <h2 style="margin: 0 0 10px; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px;">Services & Pricing</h2>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        ${rows}
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                  <tr>
                    <td style="color: #22c55e; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold;">Total: ${formatCurrency(input.total)}</td>
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius: 8px; background-color: #22c55e;">
                      <a href="tel:${sanitize(input.contactPhone)}" style="display: inline-block; padding: 12px 18px; color: #052e16; text-decoration: none; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">Contact Us</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}
