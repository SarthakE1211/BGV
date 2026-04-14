// Microsoft Graph client — app-only (client_credentials) flow.
//
// Reuses the same Azure AD app registration as NextAuth login, but needs
// an additional APPLICATION permission granted with admin consent:
//
//     Microsoft Graph → Application permissions → User.Read.All
//
// Without that, the token endpoint will return a token but the /users
// call will fail with 403. The error path in listAllUsers() surfaces that.

import { AppError } from "@/src/lib/errors";
import { logger } from "@/src/lib/logger";

const TOKEN_ENDPOINT = (tenantId: string) =>
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface CachedToken {
    token: string;
    expiresAt: number; // epoch ms
}

declare global {
    // eslint-disable-next-line no-var
    var __bgv_graph_token: CachedToken | undefined;
}

function envOrThrow(key: string): string {
    const v = process.env[key];
    if (!v) {
        throw new AppError(
            "INTERNAL",
            `${key} is not set — cannot authenticate to Microsoft Graph`,
            { status: 500 }
        );
    }
    return v;
}

/** Fetches an app-only access token. Cached in-process until ~60s before expiry. */
async function getAppToken(): Promise<string> {
    const now = Date.now();
    const cached = globalThis.__bgv_graph_token;
    if (cached && cached.expiresAt > now + 60_000) return cached.token;

    const tenantId = envOrThrow("AZURE_AD_TENANT_ID");
    const clientId = envOrThrow("AZURE_AD_CLIENT_ID");
    const clientSecret = envOrThrow("AZURE_AD_CLIENT_SECRET");

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
    });

    const res = await fetch(TOKEN_ENDPOINT(tenantId), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        logger.error("graph.token failed", { status: res.status, body: text });
        throw new AppError("INTERNAL", "Microsoft Graph token request failed", {
            status: 502,
            details: { azureStatus: res.status },
        });
    }

    const json = (await res.json()) as { access_token: string; expires_in: number };
    globalThis.__bgv_graph_token = {
        token: json.access_token,
        expiresAt: now + json.expires_in * 1000,
    };
    return json.access_token;
}

export interface GraphUser {
    id: string;
    displayName: string | null;
    mail: string | null;
    userPrincipalName: string | null;
    jobTitle?: string | null;
}

/** Paginates through /users and returns every enabled account.
 *  Capped at `maxPages` to avoid runaway on huge tenants. */
export async function listAllUsers(maxPages = 50): Promise<GraphUser[]> {
    const token = await getAppToken();
    const out: GraphUser[] = [];
    let url: string | null =
        `${GRAPH_BASE}/users` +
        `?$filter=accountEnabled eq true` +
        `&$select=id,displayName,mail,userPrincipalName,jobTitle` +
        `&$top=999`;

    for (let page = 0; page < maxPages && url; page++) {
        const res: Response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            logger.error("graph.users failed", { status: res.status, body: text });
            if (res.status === 403) {
                throw new AppError(
                    "FORBIDDEN",
                    "Graph API refused the call — the Azure app needs User.Read.All (Application permission) with admin consent",
                    { status: 403 }
                );
            }
            throw new AppError("INTERNAL", "Microsoft Graph /users request failed", {
                status: 502,
                details: { azureStatus: res.status },
            });
        }
        const json = (await res.json()) as {
            value: GraphUser[];
            "@odata.nextLink"?: string;
        };
        out.push(...json.value);
        url = json["@odata.nextLink"] ?? null;
    }
    return out;
}
