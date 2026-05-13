"use client";

import { usePathname } from "next/navigation";
import ShellLayout from "./(shell)/layout";
import StoreShell from "./store-ui/StoreShell";

export default function ShellSwitcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return isAdmin ? <ShellLayout>{children}</ShellLayout> : <StoreShell>{children}</StoreShell>;
}
