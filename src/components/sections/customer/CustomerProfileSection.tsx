"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Button,
  CardBody,
  CardShell,
  Input,
  Label,
  PasswordInput,
  Select,
} from "@/components/atoms";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

// A4-adjacent (client answer 2026-04-21): the customer can freely edit their
// stored sender info from Profile Settings. The Stripe success page's
// "Save sender to profile?" prompt writes through the same PATCH endpoint
// so both flows converge on a single server-side truth.

type AppLocale = (typeof routing.locales)[number];

type InitialProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  email: string;
  preferredLocale: AppLocale;
  /** Optional base city. Drives the "Sending from: Name, City" label in the booking flow. */
  city: string;
};

type Props = {
  initial: InitialProfile;
};

const MIN_PASSWORD_LENGTH = 8;

export function CustomerProfileSection({ initial }: Props) {
  const t = useTranslations("customerProfile");
  const tLocale = useTranslations("localeSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const [, startNavigate] = useTransition();

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [city, setCity] = useState(initial.city);
  const [preferredLocale, setPreferredLocale] = useState<AppLocale>(initial.preferredLocale);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const profileDirty =
    firstName !== initial.firstName ||
    lastName !== initial.lastName ||
    phone !== initial.phone ||
    whatsapp !== initial.whatsapp ||
    city !== initial.city ||
    preferredLocale !== initial.preferredLocale;

  const passwordValid =
    newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword;

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profileDirty || savingProfile) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          preferred_locale: preferredLocale,
          city: city.trim(),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success(t("profileSaved"));
      // If the user picked a new locale, hop the URL to it so the active
      // session immediately matches what we just persisted.
      if (preferredLocale !== initial.preferredLocale) {
        startNavigate(() => {
          router.replace({ pathname }, { locale: preferredLocale });
        });
      }
    } catch (err) {
      console.error("profile save failed:", err);
      toast.error(t("profileSaveFailed"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid || savingPassword) return;
    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t("passwordSaved"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("password update failed:", err);
      toast.error(t("passwordSaveFailed"));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <CardShell>
        <CardBody>
          <header className="mb-4">
            <h2 className="text-text-primary text-base font-semibold">{t("sectionContact")}</h2>
            <p className="text-text-muted mt-0.5 text-xs">{t("sectionContactHelper")}</p>
          </header>
          <form onSubmit={handleProfileSave} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div>
              <Label htmlFor="profile_first_name">{t("firstName")}</Label>
              <Input
                id="profile_first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="profile_last_name">{t("lastName")}</Label>
              <Input
                id="profile_last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="profile_phone">{t("phone")}</Label>
              <Input
                id="profile_phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="profile_whatsapp">{t("whatsapp")}</Label>
              <Input
                id="profile_whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                autoComplete="tel"
                placeholder={t("whatsappPlaceholder")}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="profile_city">{t("city")}</Label>
              <Input
                id="profile_city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="address-level2"
                placeholder={t("cityPlaceholder")}
                maxLength={100}
                className="mt-1.5"
              />
              <p className="text-text-muted mt-1 text-xs">{t("cityHelper")}</p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="profile_email">{t("email")}</Label>
              <Input
                id="profile_email"
                type="email"
                value={initial.email}
                readOnly
                disabled
                className="mt-1.5"
              />
              <p className="text-text-muted mt-1 text-xs">{t("emailReadOnly")}</p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="profile_preferred_locale">{t("preferredLocale")}</Label>
              <Select
                id="profile_preferred_locale"
                value={preferredLocale}
                onChange={(e) => setPreferredLocale(e.target.value as AppLocale)}
                className="mt-1.5"
              >
                {routing.locales.map((loc) => (
                  <option key={loc} value={loc}>
                    {tLocale(loc)}
                  </option>
                ))}
              </Select>
              <p className="text-text-muted mt-1 text-xs">{t("preferredLocaleHelper")}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-text-muted text-xs">
                {t("notificationPrefsIntro")}{" "}
                <Link
                  href="/customer/notifications"
                  className="text-primary-700 hover:text-primary-800 font-medium underline-offset-2 hover:underline"
                >
                  {t("notificationPrefsLink")}
                </Link>
              </p>
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" size="md" disabled={!profileDirty || savingProfile}>
                {savingProfile ? t("saving") : t("saveProfile")}
              </Button>
            </div>
          </form>
        </CardBody>
      </CardShell>

      <CardShell>
        <CardBody>
          <header className="mb-4">
            <h2 className="text-text-primary text-base font-semibold">{t("sectionPassword")}</h2>
            <p className="text-text-muted mt-0.5 text-xs">
              {t("sectionPasswordHelper", { min: MIN_PASSWORD_LENGTH })}
            </p>
          </header>
          <form onSubmit={handlePasswordSave} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div>
              <Label htmlFor="profile_new_password">{t("newPassword")}</Label>
              <PasswordInput
                id="profile_new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                showPasswordLabel={t("showPassword")}
                hidePasswordLabel={t("hidePassword")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="profile_confirm_password">{t("confirmPassword")}</Label>
              <PasswordInput
                id="profile_confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                hasError={!!confirmPassword && confirmPassword !== newPassword}
                showPasswordLabel={t("showPassword")}
                hidePasswordLabel={t("hidePassword")}
                className="mt-1.5"
              />
              {!!confirmPassword && confirmPassword !== newPassword && (
                <p className="text-error mt-1 text-xs">{t("passwordMismatch")}</p>
              )}
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" size="md" disabled={!passwordValid || savingPassword}>
                {savingPassword ? t("saving") : t("savePassword")}
              </Button>
            </div>
          </form>
        </CardBody>
      </CardShell>
    </div>
  );
}
