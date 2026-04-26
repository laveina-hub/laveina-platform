"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Shield, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { BoxIcon, ChevronIcon, MailIcon, PhoneIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { useUser } from "@/hooks/use-users";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDateTimeMedium, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/enums";

import { DetailRow, DetailSkeleton } from "./UserDetailHelpers";

const ALL_ROLES = Object.values(UserRole);

type Props = {
  userId: string;
};

export function AdminUserDetailSection({ userId }: Props) {
  const t = useTranslations("adminUsers");
  const tDashboard = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useUser(userId);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const roleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) {
        const err = await response.json();
        const code = err?.error?.code as string | undefined;
        const message =
          code === "SELF_ROLE_CHANGE" ? t("cannotChangeOwnRole") : t("roleUpdateFailed");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("roleUpdated"));
      setSelectedRole(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleRoleChange = (role: string) => {
    if (role === user?.role) return;
    setSelectedRole(role);
    setConfirmOpen(true);
  };

  const roleLabelMap: Record<string, string> = {
    admin: tDashboard("roleAdmin"),
    pickup_point: tDashboard("rolePickupPoint"),
    customer: tDashboard("roleCustomer"),
  };

  const roleDescMap: Record<string, string> = {
    admin: t("roleDescAdmin"),
    pickup_point: t("roleDescPickupPoint"),
    customer: t("roleDescCustomer"),
  };

  if (isLoading) return <DetailSkeleton />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <User size={40} className="text-border-default mb-4" />
        <h3 className="text-text-primary text-base font-semibold">{t("userNotFound")}</h3>
        <Link href="/admin/users" className="text-primary-600 mt-2 text-sm hover:underline">
          {t("backToUsers")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/users")}
          className="focus-visible:ring-primary-500 text-text-muted hover:bg-bg-muted hover:text-text-light rounded-lg p-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronIcon size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-body text-text-primary text-2xl font-semibold">{user.full_name}</h1>
          <p className="text-text-muted mt-0.5 text-sm">{user.email}</p>
        </div>
        <div className="bg-primary-500 flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="border-border-default rounded-xl border bg-white">
            <div className="border-border-muted border-b px-6 py-4">
              <h2 className="text-text-primary text-sm font-semibold">{t("userDetails")}</h2>
            </div>
            <div className="divide-border-muted divide-y px-6">
              <DetailRow icon={MailIcon} label={t("email")}>
                {user.email}
              </DetailRow>
              <DetailRow icon={PhoneIcon} label={t("phone")}>
                {user.phone ?? "—"}
              </DetailRow>
              <DetailRow icon={Shield} label={t("currentRole")}>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                    user.role === "admin" && "bg-purple-50 text-purple-700 ring-purple-600/20",
                    user.role === "pickup_point" && "bg-blue-50 text-blue-700 ring-blue-600/20",
                    user.role === "customer" &&
                      "bg-bg-secondary text-text-light ring-border-default"
                  )}
                >
                  {roleLabelMap[user.role]}
                </span>
              </DetailRow>
              <DetailRow icon={BoxIcon} label={t("shipments")}>
                {user.shipment_count}
              </DetailRow>
              <DetailRow icon={Calendar} label={t("joined")}>
                {formatDateTimeMedium(user.created_at, locale)}
              </DetailRow>
            </div>
          </div>
        </div>

        <div>
          <div className="border-border-default rounded-xl border bg-white">
            <div className="border-border-muted border-b px-6 py-4">
              <h2 className="text-text-primary text-sm font-semibold">{t("manageRole")}</h2>
              <p className="text-text-muted mt-0.5 text-xs">{t("manageRoleDesc")}</p>
            </div>
            <div className="space-y-2 p-4">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={roleMutation.isPending}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    user.role === role
                      ? "border-primary-300 bg-primary-50 ring-primary-500 ring-1"
                      : "border-border-default hover:border-border-default hover:bg-bg-secondary"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
                      user.role === role
                        ? "border-primary-500 bg-primary-500"
                        : "border-border-default"
                    )}
                  >
                    {user.role === role && (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary text-sm font-medium">{roleLabelMap[role]}</p>
                    <p className="text-text-muted mt-0.5 text-xs">{roleDescMap[role]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmRoleChangeTitle")}
        description={t("confirmRoleChangeDesc", {
          name: user.full_name,
          role: selectedRole ? roleLabelMap[selectedRole] : "",
        })}
        confirmLabel={tCommon("confirm")}
        variant="warning"
        loading={roleMutation.isPending}
        onConfirm={() => {
          if (selectedRole) {
            roleMutation.mutate(selectedRole);
          }
        }}
      />
    </div>
  );
}
