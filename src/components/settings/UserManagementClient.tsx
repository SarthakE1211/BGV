"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { UserRole } from "@/src/lib/enums";
import {
    addUser,
    setUserActive,
    updateUserRole,
    type ManagedUser,
} from "@/src/actions/users";

const ROLE_LABEL: Record<UserRole, string> = {
    [UserRole.SDM]: "SDM",
    [UserRole.SPECIALIST]: "BGV Specialist",
    [UserRole.HR_HEAD]: "HR Head",
};

const ROLE_OPTIONS: UserRole[] = [
    UserRole.SDM,
    UserRole.SPECIALIST,
    UserRole.HR_HEAD,
];

interface Props {
    users: ManagedUser[];
    currentUserId: string;
}

export default function UserManagementClient({ users: initialUsers, currentUserId }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Local state so UI updates immediately without waiting for router.refresh()
    const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState<UserRole>(UserRole.SDM);

    const handleAdd = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const email = newEmail.trim();
        if (!email) return;

        startTransition(async () => {
            const res = await addUser({ email, role: newRole });
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            toast.success(`User ${email} added. They can sign in once their M365 account is ready.`);
            setNewEmail("");
            setNewRole(UserRole.SDM);
            // Refresh server component to load new user row
            router.refresh();
        });
    };

    const handleRoleChange = (userId: string, role: UserRole) => {
        startTransition(async () => {
            const res = await updateUserRole({ userId, role });
            if (!res.ok) {
                toast.error(res.error);
                // Revert optimistic update
                router.refresh();
                return;
            }
            toast.success(`Role updated to ${ROLE_LABEL[role]}.`);
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, role } : u))
            );
        });
    };

    const handleActiveToggle = (userId: string, makeActive: boolean) => {
        // Optimistic update
        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, isActive: makeActive } : u))
        );

        startTransition(async () => {
            const res = await setUserActive({ userId, isActive: makeActive });
            if (!res.ok) {
                toast.error(res.error);
                // Revert
                setUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, isActive: !makeActive } : u))
                );
                return;
            }
            toast.success(makeActive ? "User reactivated." : "User deactivated.");
        });
    };

    return (
        <>
            {/* ── Add user ────────────────────────────────────────────── */}
            <div className="setting-group">
                <h4>Add New User</h4>
                <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}>
                    Enter the user&apos;s company Microsoft 365 email. They can sign in
                    only after you add them here.
                </p>
                <form
                    onSubmit={handleAdd}
                    style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
                >
                    <input
                        type="email"
                        required
                        placeholder="first.last@ovationwps.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        disabled={isPending}
                        style={{
                            flex: "1 1 260px",
                            padding: "8px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: 13,
                            background: "var(--card)",
                            color: "var(--text)",
                        }}
                    />
                    <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        disabled={isPending}
                        style={{
                            padding: "8px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: 13,
                            background: "var(--card)",
                            color: "var(--text)",
                        }}
                    >
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={isPending || !newEmail.trim()}
                        className="btn btn-primary btn-sm"
                    >
                        {isPending ? "Adding…" : "Add User"}
                    </button>
                </form>
            </div>

            {/* ── User list ────────────────────────────────────────────── */}
            <div className="setting-group">
                <h4>All Users ({users.length})</h4>
                <div
                    className="table-scroll"
                    style={{
                        marginTop: 6,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        overflow: "hidden",
                    }}
                >
                    <table>
                        <thead>
                            <tr>
                                <th>Name / Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Logged In</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        style={{
                                            textAlign: "center",
                                            padding: "24px 20px",
                                            color: "var(--text-light)",
                                        }}
                                    >
                                        No users yet. Add your first user above.
                                    </td>
                                </tr>
                            )}
                            {users.map((u) => {
                                const isMe = u.id === currentUserId;
                                return (
                                    <tr
                                        key={u.id}
                                        style={{
                                            opacity: !u.isActive ? 0.6 : 1,
                                            transition: "opacity 0.15s",
                                        }}
                                    >
                                        {/* Name / Email */}
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <strong>{u.name}</strong>
                                                {isMe && (
                                                    <span
                                                        style={{
                                                            fontSize: 10,
                                                            color: "var(--primary)",
                                                            fontWeight: 600,
                                                            background: "rgba(26,54,93,0.08)",
                                                            padding: "1px 5px",
                                                            borderRadius: 4,
                                                        }}
                                                    >
                                                        you
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 1 }}>
                                                {u.email}
                                            </div>
                                        </td>

                                        {/* Role selector */}
                                        <td>
                                            <select
                                                value={u.role}
                                                disabled={isPending || !u.isActive}
                                                onChange={(e) =>
                                                    handleRoleChange(u.id, e.target.value as UserRole)
                                                }
                                                style={{
                                                    padding: "4px 8px",
                                                    border: "1px solid var(--border)",
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    background: "var(--card)",
                                                    color: "var(--text)",
                                                }}
                                            >
                                                {ROLE_OPTIONS.map((r) => (
                                                    <option key={r} value={r}>
                                                        {ROLE_LABEL[r]}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Active badge */}
                                        <td>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    padding: "2px 10px",
                                                    borderRadius: 10,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: u.isActive ? "#dcfce7" : "#fee2e2",
                                                    color: u.isActive ? "#15803d" : "#b91c1c",
                                                }}
                                            >
                                                {u.isActive ? "Active" : "Disabled"}
                                            </span>
                                        </td>

                                        {/* Has logged in */}
                                        <td style={{ fontSize: 12, color: "var(--text-light)" }}>
                                            {u.hasLoggedIn ? (
                                                <span style={{ color: "var(--success)", fontWeight: 600 }}>Yes</span>
                                            ) : (
                                                "Pending"
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-success"}`}
                                                disabled={isPending || isMe}
                                                onClick={() => handleActiveToggle(u.id, !u.isActive)}
                                                title={isMe ? "You cannot deactivate yourself" : undefined}
                                                style={{ minWidth: 90 }}
                                            >
                                                {u.isActive ? "Deactivate" : "Reactivate"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>
                    Deactivating a user blocks sign-in immediately. Users are never
                    deleted because they&apos;re referenced in historical BGV records.
                </p>
            </div>
        </>
    );
}
