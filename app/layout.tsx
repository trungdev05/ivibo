import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: "BaseApp — Project Management",
  description: "Collaborative project management with spreadsheets, kanban, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans bg-white text-gray-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
