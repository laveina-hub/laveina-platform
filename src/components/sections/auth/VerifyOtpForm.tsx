"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { sendPasswordResetOtp, verifyPasswordResetOtp } from "@/actions/auth";
import { Button, OtpInput } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import { Link, useRouter } from "@/i18n/navigation";

type Props = {
  email: string | null;
};

const RESEND_COOLDOWN = 60;
const OTP_LENGTH = 6;

export function VerifyOtpForm({ email }: Props) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formattedCountdown = `${String(Math.floor(countdown / 60)).padStart(2, "0")}:${String(countdown % 60).padStart(2, "0")}`;

  async function handleVerify() {
    if (otp.length !== OTP_LENGTH) return;

    setSubmitting(true);
    setHasError(false);
    try {
      const result = await verifyPasswordResetOtp(otp);

      if (result.error) {
        setHasError(true);
        toast.error(t("invalidOtp"));
        setSubmitting(false);
        return;
      }

      router.push("/auth/reset-password");
    } catch {
      toast.error(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  const handleResend = useCallback(async () => {
    if (countdown > 0 || !email) return;

    try {
      const result = await sendPasswordResetOtp(email);
      if (result.error) {
        toast.error(t("genericError"));
        return;
      }

      setCountdown(RESEND_COOLDOWN);
      setOtp("");
      setHasError(false);
      toast.success(t("otpResent"));
    } catch {
      toast.error(t("genericError"));
    }
  }, [countdown, email, t]);

  if (!email) {
    return (
      <div className="space-y-6 text-center">
        <p className="text-text-muted">{t("otpNoEmail")}</p>
        <Link
          href="/auth/forgot-password"
          className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
        >
          {t("backToForgotPassword")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Logo */}
      <Image
        src="/images/header/logo-laveina.svg"
        alt={t("logoAlt")}
        width={180}
        height={52}
        priority
        unoptimized
        className="h-13 w-auto"
      />

      <div className="space-y-6">
        {/* Heading with back arrow */}
        <div className="flex items-center gap-3">
          <Link href="/auth/forgot-password" aria-label={t("backToForgotPassword")}>
            <ChevronIcon className="text-text-primary h-7 w-7" />
          </Link>
          <h1 className="font-display text-text-primary text-3xl leading-10.5 font-semibold tracking-tight">
            {t("forgotPasswordTitle")}
          </h1>
        </div>

        {/* Description */}
        <p className="text-text-primary text-lg leading-7 whitespace-pre-line">
          {t("otpDescription")}
        </p>

        {/* OTP Input */}
        <OtpInput
          length={OTP_LENGTH}
          value={otp}
          onChange={(val) => {
            setOtp(val);
            setHasError(false);
          }}
          hasError={hasError}
          disabled={submitting}
        />

        {/* Continue button */}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full gap-2 rounded-xl"
          disabled={submitting || otp.length !== OTP_LENGTH}
          aria-busy={submitting}
          onClick={handleVerify}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t("otpContinue")}
            </span>
          ) : (
            <>
              {t("otpContinue")}
              <ChevronIcon direction="right" className="h-5 w-5" />
            </>
          )}
        </Button>

        {/* Resend */}
        <p className="text-center text-sm">
          <span className="text-text-primary">{t("otpDidntReceive")}</span>{" "}
          {countdown > 0 ? (
            <span className="text-text-primary">
              {t("otpResendIn")}{" "}
              <span className="font-medium text-black">{formattedCountdown}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
            >
              {t("otpResendNow")}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
