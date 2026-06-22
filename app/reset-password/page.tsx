import { RecoveryFrame, ResetPasswordForm } from "@/components/account-recovery";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <RecoveryFrame eyebrow="Account recovery" title="Choose a new password" description="Use at least eight characters. This secure link can only be used once."><ResetPasswordForm token={token} /></RecoveryFrame>;
}
