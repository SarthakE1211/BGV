// src/app/(protected)/settings/users/page.tsx

import { requireAuth } from "@/src/lib/auth.helpers";
import { UserRole } from "@/src/lib/enums";
import { listUsers } from "@/src/actions/users";
import UserManagementClient from "@/src/components/settings/UserManagementClient";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
    const me = await requireAuth(UserRole.HR_HEAD);
    const users = await listUsers();

    return <UserManagementClient users={users} currentUserId={me.id} />;
}
