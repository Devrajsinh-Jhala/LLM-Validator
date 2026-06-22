import { RecoveryFrame, VerifyEmailAction } from "@/components/account-recovery";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <RecoveryFrame eyebrow="Workspace security" title="Verify your email" description="Confirm this address to protect your account and receive monitoring notifications."><VerifyEmailAction token={token} /></RecoveryFrame>;
}
