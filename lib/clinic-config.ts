import "server-only";
import { env } from "@/lib/env";

/**
 * Clinic-level configuration derived from the environment.
 *
 * The InstaPay handle and Vodafone Cash numbers are the clinic's real money
 * destinations, so they live in `.env` rather than in the repository. Everything
 * returned here is a plain serialisable object and is safe to pass from a Server
 * Component into a Client Component as props.
 */
export interface ClinicConfig {
  nameAr: string;
  instapayHandle: string;
  vodafoneCashNumbers: string[];
  whatsappNumber: string;
  addressAr: string;
  mapsUrl: string;
  holdMinutes: number;
}

export function getClinicConfig(): ClinicConfig {
  return {
    nameAr: env.CLINIC_NAME_AR,
    instapayHandle: env.CLINIC_INSTAPAY_HANDLE,
    vodafoneCashNumbers: env.CLINIC_VODAFONE_CASH_NUMBERS.split(",")
      .map((number) => number.trim())
      .filter(Boolean),
    whatsappNumber: env.CLINIC_WHATSAPP_NUMBER,
    addressAr: env.CLINIC_ADDRESS_AR,
    mapsUrl: env.CLINIC_MAPS_URL,
    holdMinutes: env.BOOKING_HOLD_MINUTES,
  };
}

export const bookingPolicy = {
  holdMinutes: env.BOOKING_HOLD_MINUTES,
  minNoticeMinutes: env.BOOKING_MIN_NOTICE_MINUTES,
  horizonDays: env.BOOKING_HORIZON_DAYS,
} as const;
