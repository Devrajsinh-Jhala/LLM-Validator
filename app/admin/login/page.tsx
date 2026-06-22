import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { adminAuthenticated } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  if (await adminAuthenticated()) redirect("/admin");
  return <AdminLoginForm />;
}
