import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { currentAccount } from "@/lib/auth";

export default async function LoginPage() {
  if (await currentAccount()) redirect("/dashboard");
  return <AuthForm mode="login" />;
}
