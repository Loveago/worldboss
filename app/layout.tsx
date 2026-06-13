import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./(shell)/globals.css";
import Providers from "./(shell)/providers";
import ShellSwitcher from "./ShellSwitcher";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

export const metadata: Metadata = {
  title: "Korrely",
  description: "Korrely admin & storefront",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${inter.variable} ${sora.variable}`}>
        <Providers>
          <ShellSwitcher>{children}</ShellSwitcher>
        </Providers>
      </body>
    </html>
  );
}
