// src/app/(protected)/requests/new/page.tsx

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth.helpers";
import { getPartnerOptionsWithIds } from "@/src/lib/requests";
import RequestForm from "@/src/components/requests/RequestForm";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
    const user = await requireAuth();

    if (user.role === "SPECIALIST") {
        redirect("/requests");
    }

    const partners = await getPartnerOptionsWithIds();

    return <RequestForm partners={partners} />;
}
