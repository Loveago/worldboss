import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("token")?.value;
  if (!token) {
    redirect("/login");
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== "ADMIN") {
    redirect("/login");
  }
  return children;
}
