import { Suspense } from "react";
import { VerifyEmail } from "./verify-email";

export const metadata = { title: "Подтверждение email" };

// Link from the email built by HEADLESS_FRONTEND_URLS["account_confirm_email"]
export default function VerifyEmailPage({ params }: PageProps<"/verify-email/[key]">) {
  return (
    <Suspense>
      {params.then(({ key }) => (
        <VerifyEmail verificationKey={decodeURIComponent(key)} />
      ))}
    </Suspense>
  );
}
