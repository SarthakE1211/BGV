import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
    title: "BGV Portal — Ovation WPS",
    description: "Background Verification Management Portal",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="bgv-app">
                {children}
                <Toaster position="top-right" richColors closeButton />
            </body>
        </html>
    );
}
