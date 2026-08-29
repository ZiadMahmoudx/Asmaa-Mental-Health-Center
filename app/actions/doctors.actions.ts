"use server";

import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, success } from "@/lib/result";
import { toEgp, toStringArray } from "@/lib/serialization";

/**
 * Public directory reads.
 *
 * Deliberately unauthenticated: a prospective patient must be able to browse
 * consultants and prices before creating an account, and nothing returned here
 * is sensitive. Note what is NOT selected - the doctor's email, phone, and the
 * `User` row behind the profile never leave the server. Only the professional
 * details the clinic publishes are exposed.
 */

export interface DoctorCardView {
  id: string;
  fullName: string;
  title: string;
  titleEn: string | null;
  licenseNumber: string;
  specialties: string[];
  specialtiesEn: string[];
  bio: string;
  bioEn: string | null;
  yearsOfExperience: number;
  priceOnlineEGP: number;
  priceOfflineEGP: number;
  defaultDurationMins: number;
  roomNumber: string | null;
  avatarUrl: string | null;
  isAcceptingPatients: boolean;
  /** True when the doctor publishes at least one in-clinic window. */
  offersOffline: boolean;
  offersOnline: boolean;
}

const DOCTOR_SELECT = {
  id: true,
  title: true,
  titleEn: true,
  licenseNumber: true,
  specialtiesJson: true,
  specialtiesEnJson: true,
  bio: true,
  bioEn: true,
  yearsOfExperience: true,
  sessionPriceOnline: true,
  sessionPriceOffline: true,
  defaultDurationMins: true,
  roomNumber: true,
  avatarUrl: true,
  isAcceptingPatients: true,
  user: { select: { fullName: true, isActive: true } },
  availability: {
    where: { isActive: true },
    select: { isOnlineAvailable: true, isOfflineAvailable: true },
  },
} as const;

type DoctorRow = {
  id: string;
  title: string;
  titleEn: string | null;
  licenseNumber: string;
  specialtiesJson: string;
  specialtiesEnJson: string;
  bio: string;
  bioEn: string | null;
  yearsOfExperience: number;
  sessionPriceOnline: unknown;
  sessionPriceOffline: unknown;
  defaultDurationMins: number;
  roomNumber: string | null;
  avatarUrl: string | null;
  isAcceptingPatients: boolean;
  user: { fullName: string; isActive: boolean };
  availability: { isOnlineAvailable: boolean; isOfflineAvailable: boolean }[];
};

function toCard(doctor: DoctorRow): DoctorCardView {
  return {
    id: doctor.id,
    fullName: doctor.user.fullName,
    title: doctor.title,
    titleEn: doctor.titleEn,
    licenseNumber: doctor.licenseNumber,
    // Stored as JSON text so the column is portable to SQL Server.
    specialties: toStringArray(doctor.specialtiesJson),
    specialtiesEn: toStringArray(doctor.specialtiesEnJson),
    bio: doctor.bio,
    bioEn: doctor.bioEn,
    yearsOfExperience: doctor.yearsOfExperience,
    priceOnlineEGP: toEgp(doctor.sessionPriceOnline as never),
    priceOfflineEGP: toEgp(doctor.sessionPriceOffline as never),
    defaultDurationMins: doctor.defaultDurationMins,
    roomNumber: doctor.roomNumber,
    avatarUrl: doctor.avatarUrl,
    isAcceptingPatients: doctor.isAcceptingPatients,
    offersOnline: doctor.availability.some((window) => window.isOnlineAvailable),
    offersOffline: doctor.availability.some((window) => window.isOfflineAvailable),
  };
}

/** Every consultant the clinic publishes, accepting patients first. */
export async function getDoctorsAction(): Promise<ActionResult<DoctorCardView[]>> {
  const doctors = await prisma.doctorProfile.findMany({
    where: { user: { isActive: true } },
    orderBy: [{ isAcceptingPatients: "desc" }, { yearsOfExperience: "desc" }],
    select: DOCTOR_SELECT,
  });

  return success(doctors.map((doctor) => toCard(doctor as DoctorRow)));
}

/** A single consultant, for the booking page. */
export async function getDoctorAction(
  doctorId: string,
): Promise<ActionResult<DoctorCardView>> {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    select: DOCTOR_SELECT,
  });

  if (!doctor || !doctor.user.isActive) {
    return Failures.notFound("الطبيب المطلوب");
  }

  return success(toCard(doctor as DoctorRow));
}
