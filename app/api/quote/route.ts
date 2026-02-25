import sgMail from "@sendgrid/mail";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import type { MailDataRequired } from "@sendgrid/helpers/classes/mail";

import { buildQuoteEmailHtml } from "@/lib/emailTemplate";
import { calculateQuote } from "@/lib/pricing";
import type { ServiceKey } from "@/lib/types";
import {
  extractTenantSlugFromPath,
  getRequestHost,
  isAllowedEmbedOrigin,
  resolveTenant,
  resolveTenantFromSlug,
} from "@/src/lib/tenant";
import type { TenantConfig } from "@/src/lib/tenant";

export const runtime = "nodejs";

const DEFAULT_CONTACT_PHONE = "+18016516326";
const RETRY_DELAYS_MS = [300, 900];
const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_PER_HOUR = 30;
const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

interface RateLimitState {
  minuteStartedAt: number;
  minuteCount: number;
  hourStartedAt: number;
  hourCount: number;
  lastSeenAt: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
let rateLimitTick = 0;
let sendGridConfigured = false;

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

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function ensureSendGridConfigured() {
  if (sendGridConfigured) {
    return;
  }

  const apiKey = getRequiredEnv("SENDGRID_API_KEY");
  sgMail.setApiKey(apiKey);
  sendGridConfigured = true;
}

function getErrorStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const withCode = error as { code?: unknown; response?: { statusCode?: unknown } };

  if (typeof withCode.code === "number") {
    return withCode.code;
  }

  if (typeof withCode.response?.statusCode === "number") {
    return withCode.response.statusCode;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function isTransientSendError(statusCode: number | null) {
  if (statusCode === null) {
    return true;
  }

  if (statusCode === 408 || statusCode === 429) {
    return true;
  }

  return statusCode >= 500;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanupRateLimitStore(now: number) {
  rateLimitTick += 1;

  if (rateLimitTick < 200) {
    return;
  }

  rateLimitTick = 0;

  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.lastSeenAt > ONE_HOUR_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}

function enforceRateLimit(key: string, now: number) {
  const state = rateLimitStore.get(key) ?? {
    minuteStartedAt: now,
    minuteCount: 0,
    hourStartedAt: now,
    hourCount: 0,
    lastSeenAt: now,
  };

  if (now - state.minuteStartedAt >= ONE_MINUTE_MS) {
    state.minuteStartedAt = now;
    state.minuteCount = 0;
  }

  if (now - state.hourStartedAt >= ONE_HOUR_MS) {
    state.hourStartedAt = now;
    state.hourCount = 0;
  }

  state.lastSeenAt = now;

  if (state.minuteCount >= RATE_LIMIT_PER_MINUTE || state.hourCount >= RATE_LIMIT_PER_HOUR) {
    rateLimitStore.set(key, state);
    cleanupRateLimitStore(now);

    const minuteRetrySeconds = state.minuteCount >= RATE_LIMIT_PER_MINUTE ? Math.ceil((ONE_MINUTE_MS - (now - state.minuteStartedAt)) / 1000) : 0;
    const hourRetrySeconds = state.hourCount >= RATE_LIMIT_PER_HOUR ? Math.ceil((ONE_HOUR_MS - (now - state.hourStartedAt)) / 1000) : 0;

    return {
      allowed: false,
      retryAfterSeconds: Math.max(minuteRetrySeconds, hourRetrySeconds, 1),
    };
  }

  state.minuteCount += 1;
  state.hourCount += 1;

  rateLimitStore.set(key, state);
  cleanupRateLimitStore(now);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

function getHeaderOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getTenantSlugFromRequest(request: NextRequest): string | null {
  const slugFromHeader = request.headers.get("x-tenant-slug");
  if (slugFromHeader && resolveTenantFromSlug(slugFromHeader)) {
    return slugFromHeader;
  }

  const slugFromPath = extractTenantSlugFromPath(request.nextUrl.pathname);
  if (slugFromPath) {
    return slugFromPath;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    return extractTenantSlugFromPath(refererUrl.pathname);
  } catch {
    return null;
  }
}

function isRequestOriginAllowed(request: NextRequest, tenant: TenantConfig) {

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const origin = getHeaderOrigin(originHeader);
  const refererOrigin = getHeaderOrigin(refererHeader);

  if (!origin && !refererOrigin) {
    return false;
  }

  // Se permite solo origen autorizado del tenant.
  if (isAllowedEmbedOrigin(tenant, origin) || isAllowedEmbedOrigin(tenant, refererOrigin)) {
    return true;
  }

  // Si no hay dominios declarados, se acepta el mismo origen de la app.
  if (tenant.allowedDomains.length === 0) {
    const selfOrigin = request.nextUrl.origin;
    return origin === selfOrigin || refererOrigin === selfOrigin;
  }

  return false;
}

async function sendWithRetry(options: {
  message: MailDataRequired;
  tenantSlug: string;
  host: string;
  ip: string;
  recipientType: "owner" | "customer";
}) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }

    try {
      const [response] = await sgMail.send(options.message);
      const messageId = (response.headers?.["x-message-id"] as string | undefined) ?? null;

      console.log(
        JSON.stringify({
          event: "quote_email_sent",
          tenant: options.tenantSlug,
          host: options.host,
          ip: options.ip,
          recipientType: options.recipientType,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1,
          statusCode: response.statusCode,
          messageId,
        }),
      );

      return;
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      const transient = isTransientSendError(statusCode);

      console.error(
        JSON.stringify({
          event: "quote_email_failed",
          tenant: options.tenantSlug,
          host: options.host,
          ip: options.ip,
          recipientType: options.recipientType,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1,
          statusCode,
          transient,
          reason: getErrorMessage(error),
        }),
      );

      if (!transient || attempt === RETRY_DELAYS_MS.length) {
        throw error;
      }
    }
  }
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const host = getRequestHost(request.headers);
  const tenantSlug = getTenantSlugFromRequest(request);
  const tenant = resolveTenant({ host, slug: tenantSlug });
  const ip = getClientIp(request);

  if (!isRequestOriginAllowed(request, tenant)) {
    console.error(
      JSON.stringify({
        event: "quote_origin_rejected",
        tenant: tenant.slug,
        host,
        ip,
        timestamp,
      }),
    );

    return NextResponse.json(
      {
        ok: false,
        error: "This domain is not authorized to submit quotes.",
      },
      { status: 403 },
    );
  }

  const rateLimit = enforceRateLimit(`${tenant.slug}:${ip}`, Date.now());

  if (!rateLimit.allowed) {
    console.error(
      JSON.stringify({
        event: "quote_rate_limited",
        tenant: tenant.slug,
        host,
        ip,
        timestamp,
      }),
    );

    const response = NextResponse.json(
      {
        ok: false,
        error: "Too many requests. Please wait a moment and try again.",
      },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  try {
    ensureSendGridConfigured();

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

    const supportPhone = tenant.supportPhone ?? DEFAULT_CONTACT_PHONE;
    const ownerSubject = `New Instant Quote Lead - ${payload.address}`;
    const customerSubject = `Your Quote for - ${payload.address}`;

    const ownerHtml = buildQuoteEmailHtml({
      name: payload.name,
      address: payload.address,
      sqft: payload.sqft,
      preferredDate: payload.preferredDate,
      services: calculated.lineItems,
      total: calculated.total,
      contactPhone: supportPhone,
      customerEmail: payload.email,
      customerPhone: payload.phone,
      showLeadDetails: true,
    });

    const customerHtml = buildQuoteEmailHtml({
      name: payload.name,
      address: payload.address,
      sqft: payload.sqft,
      preferredDate: payload.preferredDate,
      services: calculated.lineItems,
      total: calculated.total,
      contactPhone: supportPhone,
    });

    const fromEmail = getRequiredEnv("SENDGRID_FROM_EMAIL");

    await sendWithRetry({
      message: {
        to: tenant.ownerEmail,
        from: fromEmail,
        subject: ownerSubject,
        html: ownerHtml,
        ...(tenant.pushoverBcc ? { bcc: tenant.pushoverBcc } : {}),
      },
      tenantSlug: tenant.slug,
      host,
      ip,
      recipientType: "owner",
    });

    try {
      await sendWithRetry({
        message: {
          to: payload.email,
          from: fromEmail,
          subject: customerSubject,
          html: customerHtml,
        },
        tenantSlug: tenant.slug,
        host,
        ip,
        recipientType: "customer",
      });
    } catch (error) {
      // El lead principal ya fue entregado al owner; el fallo del correo cliente no bloquea el flujo.
      console.error(
        JSON.stringify({
          event: "quote_customer_email_non_blocking_failure",
          tenant: tenant.slug,
          host,
          ip,
          timestamp: new Date().toISOString(),
          reason: getErrorMessage(error),
        }),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request payload.",
        },
        { status: 400 },
      );
    }

    console.error(
      JSON.stringify({
        event: "quote_submission_failed",
        tenant: tenant.slug,
        host,
        ip,
        timestamp: new Date().toISOString(),
        reason: getErrorMessage(error),
      }),
    );

    return NextResponse.json(
      {
        ok: false,
        error: "We could not send your quote right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
