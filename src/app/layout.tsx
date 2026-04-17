import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import {
    ThemeProvider,
    THEME_BOOTSTRAP_SCRIPT,
} from "@/src/components/theme/ThemeProvider";

export const metadata: Metadata = {
    title: "BGV Portal — Ovation WPS",
    description: "Background Verification Management Portal",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Runs before any CSS paint — reads localStorage / system
                    preference and sets <html data-theme> so the right palette
                    is active on the first frame. No FOUC. */}
                <script
                    dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
                />
            </head>
            <body className="bgv-app">
                <ThemeProvider>
                    {children}
                    <Toaster position="top-right" richColors closeButton />
                </ThemeProvider>
            </body>
        </html>
    );
}
