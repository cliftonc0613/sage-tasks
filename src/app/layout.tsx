import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import WorkspaceTabs from "@/components/WorkspaceTabs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GroundControl - Project Management",
  description: "Task management and sales pipeline for Clifton & Sage",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GroundControl",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f0f12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-[#0f0f12] text-gray-100 antialiased`}>
        <ConvexClientProvider>
          <div className="h-screen flex flex-col">
            <WorkspaceTabs />
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
