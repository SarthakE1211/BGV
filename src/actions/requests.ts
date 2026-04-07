// src/actions/requests.ts
"use server";

import { requireAuth } from "@/src/lib/auth.helpers";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { UserRole, BGVStatus, RoleType, Region, BGVVendor, Priority } from "@prisma/client";

interface SubmitRequestInput {
    candidateId: string;
    partnerId: string;
    partnerClientId?: string;
    roleType: RoleType;
    region: Region;
    bgvVendor: BGVVendor;
    priority: Priority;
    deploymentDate?: Date;
    notes?: string;
}

/**
 * Submit a new BGV request.
 * Only SDM and HR_HEAD can submit (not SPECIALIST).
 */
export async function submitRequest(input: SubmitRequestInput) {
    // Any authenticated user can submit — adjust minRole if needed
    const user = await requireAuth();

    // Generate request number: BGV-2026-XXXX
    const count = await prisma.bGVRequest.count();
    const requestNumber = `BGV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const request = await prisma.bGVRequest.create({
        data: {
            ...input,
            requestNumber,
            submittedById: user.id,
            status: BGVStatus.PENDING,
        },
    });

    // Audit log
    await prisma.activityLog.create({
        data: {
            bgvRequestId: request.id,
            performedById: user.id,
            action: "REQUEST_SUBMITTED",
            details: `Request ${requestNumber} submitted by ${user.name}`,
        },
    });

    revalidatePath("/requests");
    return request;
}

/**
 * Approve a pending BGV request.
 * Only HR_HEAD can approve.
 */
export async function approveRequest(requestId: string) {
    const user = await requireAuth(UserRole.HR_HEAD);

    const request = await prisma.bGVRequest.update({
        where: { id: requestId },
        data: {
            status: BGVStatus.IN_PROGRESS,
            approvedById: user.id,
            initiationDate: new Date(),
        },
    });

    await prisma.activityLog.create({
        data: {
            bgvRequestId: requestId,
            performedById: user.id,
            action: "REQUEST_APPROVED",
            details: `Approved by ${user.name} (HR_HEAD)`,
        },
    });

    revalidatePath("/requests");
    return request;
}