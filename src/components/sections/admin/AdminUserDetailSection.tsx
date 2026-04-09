"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Box, Calendar, Mail, Phone, Shield, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { useUser } from "@/hooks/use-users";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/enums";

import { DetailRow, DetailSkeleton, formatDate } from "./user-detail-helpers";

const ALL_ROLES = Object.values(UserRole);

type Props = {
  userId: string;
};

export function AdminUserDetailSection({ userId }: Props) {
  const t = useTranslations("adminUsers");
  const tDashboard = useTranslations("dashboard");
  const tCommon = useTranslations("common");
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
        throw new Error(err.error?.message ?? "Failed to update role");
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
        <User size={40} className="mb-4 text-gray-300" />
        <h3 className="text-base font-semibold text-gray-900">{t("userNotFound")}</h3>
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
          className="focus-visible:ring-primary-500 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-body text-2xl font-semibold text-gray-900">{user.full_name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{user.email}</p>
        </div>
        <div className="bg-primary-500 flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">{t("userDetails")}</h2>
            </div>
            <div className="divide-y divide-gray-100 px-6">
              <DetailRow icon={Mail} label={t("email")}>
                {user.email}
              </DetailRow>
              <DetailRow icon={Phone} label={t("phone")}>
                {user.phone ?? "—"}
              </DetailRow>
              <DetailRow icon={Shield} label={t("currentRole")}>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                    user.role === "admin" && "bg-purple-50 text-purple-700 ring-purple-600/20",
                    user.role === "pickup_point" && "bg-blue-50 text-blue-700 ring-blue-600/20",
                    user.role === "customer" && "bg-gray-50 text-gray-600 ring-gray-500/10"
                  )}
                >
                  {roleLabelMap[user.role]}
                </span>
              </DetailRow>
              <DetailRow icon={Box} label={t("shipments")}>
                {user.shipment_count}
              </DetailRow>
              <DetailRow icon={Calendar} label={t("joined")}>
                {formatDate(user.created_at)}
              </DetailRow>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">{t("manageRole")}</h2>
              <p className="mt-0.5 text-xs text-gray-500">{t("manageRoleDesc")}</p>
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
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
                      user.role === role ? "border-primary-500 bg-primary-500" : "border-gray-300"
                    )}
                  >
                    {user.role === role && (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{roleLabelMap[role]}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{roleDescMap[role]}</p>
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
