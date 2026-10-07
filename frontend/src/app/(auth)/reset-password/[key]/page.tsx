import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Новый пароль" };

// Link from the email built by HEADLESS_FRONTEND_URLS["account_reset_password_from_key"]
export default function ResetPasswordPage({ params }: PageProps<"/reset-password/[key]">) {
  return (
    <Suspense>
      {params.then(({ key }) => (
        <ResetPasswordForm resetKey={decodeURIComponent(key)} />
      ))}
    </Suspense>
  );
}
