import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { buildQuoteEmailHtml } from "@/lib/emailTemplate";
import { calculateQuote } from "@/lib/pricing";
import { sendQuoteEmails } from "@/lib/sendgrid";
import type { ServiceKey } from "@/lib/types";

export const runtime = "nodejs";

const CONTACT_PHONE = "+18016516326";

const serviceKeyEnum = z.enum(["mowing", "aeration", "powerRake", "seed", "fertWeed"]);

const serviceItemSchema = z
  .object({
    key: serviceKeyEnum,
    frequency: z.enum(["weekly", "biweekly"]).optional(),
    price: z.number().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (value.key === "mowing" && !value.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["frequency"],
        message: "Mowing requires a frequency.",
      });
    }

    if (value.key !== "mowing" && value.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["frequency"],
        message: "Only mowing accepts frequency.",
      });
    }
  });

const quotePayloadSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(7).max(40),
  email: z.string().email().max(180),
  address: z.string().min(3).max(300),
  preferredDate: z.string().max(40).nullable(),
  sqft: z.number().int(),
  services: z.array(serviceItemSchema).min(1),
  total: z.number().nonnegative(),
});

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = quotePayloadSchema.parse(body);

    const selectedServices = [...new Set(payload.services.map((service) => service.key))] as ServiceKey[];
    const mowingFrequency = payload.services.find((service) => service.key === "mowing")?.frequency ?? "weekly";

    const calculated = calculateQuote(payload.sqft, selectedServices, mowingFrequency);

    if (calculated.lineItems.length !== payload.services.length) {
      return badRequest("Invalid services payload.");
    }

    const calculatedByKey = new Map(calculated.lineItems.map((item) => [item.key, item]));

    for (const service of payload.services) {
      const expected = calculatedByKey.get(service.key);

      if (!expected) {
        return badRequest(`Unknown service: ${service.key}`);
      }

      if (service.key === "mowing" && service.frequency !== mowingFrequency) {
        return badRequest("Invalid mowing frequency.");
      }

      if (Math.abs(roundCurrency(service.price) - roundCurrency(expected.price)) > 0.01) {
        return badRequest("One or more service prices are invalid.");
      }
    }

    if (Math.abs(roundCurrency(payload.total) - roundCurrency(calculated.total)) > 0.01) {
      return badRequest("Quote total does not match selected services.");
    }

    const customerHtml = buildQuoteEmailHtml({
      name: payload.name,
      address: payload.address,
      sqft: payload.sqft,
      preferredDate: payload.preferredDate,
      services: calculated.lineItems,
      total: calculated.total,
      contactPhone: CONTACT_PHONE,
    });

    const ownerHtml = buildQuoteEmailHtml({
      name: payload.name,
      address: payload.address,
      sqft: payload.sqft,
      preferredDate: payload.preferredDate,
      services: calculated.lineItems,
      total: calculated.total,
      contactPhone: CONTACT_PHONE,
      customerEmail: payload.email,
      customerPhone: payload.phone,
      showLeadDetails: true,
    });

    await sendQuoteEmails({
      customerEmail: payload.email,
      customerSubject: `Your Quote for - ${payload.address}`,
      customerHtml,
      ownerSubject: `New Instant Quote Lead - ${payload.address}`,
      ownerHtml,
    });

    return NextResponse.json({ ok: true, total: calculated.total });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request payload.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
