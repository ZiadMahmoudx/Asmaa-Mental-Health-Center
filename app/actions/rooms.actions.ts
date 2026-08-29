"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/security/audit";
import { z } from "zod";

export interface ClinicRoomView {
  id: string;
  name: string;
  floor: string | null;
  capacity: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

const createRoomSchema = z.object({
  name: z.string().min(1, "اسم الغرفة مطلوب").max(60),
  floor: z.string().max(30).optional().nullable(),
  capacity: z.coerce.number().int().min(1).default(1),
  notes: z.string().max(300).optional().nullable(),
});

const updateRoomSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1, "اسم الغرفة مطلوب").max(60),
  floor: z.string().max(30).optional().nullable(),
  capacity: z.coerce.number().int().min(1).default(1),
  notes: z.string().max(300).optional().nullable(),
});

/** List all clinic rooms for admin schedule allocation. */
export async function getClinicRoomsAction(onlyActive = false): Promise<ActionResult<ClinicRoomView[]>> {
  const guard = await requireRole(["ADMIN", "DOCTOR"]);
  if (!guard.ok) return guard;

  const rooms = await prisma.clinicRoom.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: [{ floor: "asc" }, { name: "asc" }],
  });

  return success(
    rooms.map((r) => ({
      id: r.id,
      name: r.name,
      floor: r.floor,
      capacity: r.capacity,
      isActive: r.isActive,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    })),
  );
}

/** Admin creates a new clinic physical room. */
export async function createClinicRoomAction(
  _prevState: ActionResult<ClinicRoomView> | null,
  formData: FormData,
): Promise<ActionResult<ClinicRoomView>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = createRoomSchema.safeParse({
    name: formData.get("name"),
    floor: formData.get("floor") || null,
    capacity: formData.get("capacity") || 1,
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "بيانات الغرفة غير صالحة.", "Invalid room details.");
  }

  try {
    const created = await prisma.clinicRoom.create({
      data: parsed.data,
    });

    await recordAudit({
      actorId: guard.data.user.id,
      action: "ROOM_CREATED",
      entityType: "ClinicRoom",
      entityId: created.id,
      metadata: { name: created.name, floor: created.floor },
    });

    revalidatePath("/dashboard/admin/schedule");
    revalidatePath("/dashboard/admin/verification");

    return success({
      id: created.id,
      name: created.name,
      floor: created.floor,
      capacity: created.capacity,
      isActive: created.isActive,
      notes: created.notes,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure("CONFLICT", "يوجد غرفة مسجلة بهذا الاسم بالفعل.", "A room with this name already exists.");
    }
    console.error("[rooms] Failed to create room:", error);
    return Failures.internal();
  }
}

/** Admin updates an existing clinic physical room. */
export async function updateClinicRoomAction(
  _prevState: ActionResult<ClinicRoomView> | null,
  formData: FormData,
): Promise<ActionResult<ClinicRoomView>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = updateRoomSchema.safeParse({
    roomId: formData.get("roomId"),
    name: formData.get("name"),
    floor: formData.get("floor") || null,
    capacity: formData.get("capacity") || 1,
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "بيانات الغرفة غير صالحة.", "Invalid room details.");
  }

  const { roomId, ...data } = parsed.data;

  try {
    const updated = await prisma.clinicRoom.update({
      where: { id: roomId },
      data,
    });

    await recordAudit({
      actorId: guard.data.user.id,
      action: "ROOM_UPDATED",
      entityType: "ClinicRoom",
      entityId: updated.id,
      metadata: { name: updated.name, floor: updated.floor },
    });

    revalidatePath("/dashboard/admin/schedule");
    revalidatePath("/dashboard/admin/verification");

    return success({
      id: updated.id,
      name: updated.name,
      floor: updated.floor,
      capacity: updated.capacity,
      isActive: updated.isActive,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure("CONFLICT", "يوجد غرفة مسجلة بهذا الاسم بالفعل.", "A room with this name already exists.");
    }
    console.error("[rooms] Failed to update room:", error);
    return Failures.internal();
  }
}

/** Admin toggles room active status. */
export async function toggleClinicRoomStatusAction(
  _prevState: ActionResult<{ roomId: string; isActive: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ roomId: string; isActive: boolean }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const roomId = formData.get("roomId") as string;
  if (!roomId) return failure("VALIDATION_ERROR", "معرف الغرفة مطلوب.", "Room ID is required.");

  const room = await prisma.clinicRoom.findUnique({
    where: { id: roomId },
    select: { id: true, isActive: true, name: true },
  });

  if (!room) return Failures.notFound("الغرفة");

  const updated = await prisma.clinicRoom.update({
    where: { id: roomId },
    data: { isActive: !room.isActive },
    select: { id: true, isActive: true },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "ROOM_STATUS_TOGGLED",
    entityType: "ClinicRoom",
    entityId: roomId,
    metadata: { name: room.name, newStatus: updated.isActive },
  });

  revalidatePath("/dashboard/admin/schedule");
  revalidatePath("/dashboard/admin/verification");

  return success({
    roomId: updated.id,
    isActive: updated.isActive,
  });
}
