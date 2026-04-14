// src/app/(protected)/requests/[id]/page.tsx

import { notFound } from "next/navigation";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    getRequestDetail,
    getRequestChecks,
    getRequestActivity,
} from "@/src/lib/request-detail";
import RequestDetail from "@/src/components/requests/RequestDetail";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: PageProps) {
    const { id } = await params;
    const user = await requireAuth();

    const request = await getRequestDetail(id, user.role, user.id);
    if (!request) notFound();

    const [checks, activity] = await Promise.all([
        getRequestChecks(id),
        getRequestActivity(id, 50),
    ]);

    return (
        <RequestDetail
            request={request}
            checks={checks}
            activity={activity}
            viewerRole={user.role}
        />
    );
}
