import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "Restaurant LMS — Enterprise Compliance & Training",
  description: "Apple-grade restaurant compliance and video training portal with anti-cheat verification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-black text-white selection:bg-blue-600 selection:text-white">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
