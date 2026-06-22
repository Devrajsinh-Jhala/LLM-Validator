import { ForgotPasswordForm, RecoveryFrame } from "@/components/account-recovery";

export default function ForgotPasswordPage() {
  return <RecoveryFrame eyebrow="Account recovery" title="Reset your password" description="Enter your account email and we will send a secure, one-time reset link."><ForgotPasswordForm /></RecoveryFrame>;
}
