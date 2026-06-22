import type { Metadata } from "next";
import { brandAssets, brandCopy } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: brandCopy.platformName,
  description: "Connected Hospitality internal business operations platform",
  icons: {
    icon: [
      { url: brandAssets.favicon },
      { url: brandAssets.favicon32, sizes: "32x32", type: "image/png" }
    ],
    apple: brandAssets.appleTouchIcon
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
