// Single source of truth for which pages need revalidating when a given
// domain entity changes. Actions call these instead of hand-rolling
// revalidatePath lists, so adding a new page only requires editing here.

import { revalidatePath } from "next/cache";

export function invalidateRequest(requestId: string): void {
    revalidatePath("/requests");
    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/dashboard");
}

export function invalidateCheck(requestId: string): void {
    revalidatePath("/tracker");
    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/requests");
    revalidatePath("/dashboard");
}

export function invalidateBlacklist(requestId: string): void {
    revalidatePath("/tracker");
    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/requests");
    revalidatePath("/blacklist");
    revalidatePath("/dashboard");
}
