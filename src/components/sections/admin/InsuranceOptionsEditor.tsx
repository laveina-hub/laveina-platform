"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/atoms";

import type { FormAction, InsuranceOption } from "./admin-settings.data";

type InsuranceOptionsEditorProps = {
  insurance: InsuranceOption[];
  dispatch: (action: FormAction) => void;
};

/**
 * Insurance tier editor (A3). Coverage amounts are seeded and read-only;
 * admins edit the surcharge and toggle the `is_active` flag. Parent reducer
 * persists changes through `/api/admin/settings` on Save.
 */
export function InsuranceOptionsEditor({ insurance, dispatch }: InsuranceOptionsEditorProps) {
  const t = useTranslations("adminSettings");

  return (
    <section className="border-border-default space-y-4 rounded-xl border bg-white p-5">
      <div>
        <h2 className="text-text-primary text-base font-semibold">{t("insuranceOptions")}</h2>
        <p className="text-text-muted mt-1 text-xs">{t("insuranceDesc")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border-default text-text-muted border-b text-left text-xs font-semibold uppercase">
              <th className="py-2 pr-4">{t("coverage")}</th>
              <th className="py-2 pr-4">{t("surcharge")}</th>
              <th className="py-2">{t("isActive")}</th>
            </tr>
          </thead>
          <tbody>
            {insurance.map((opt, i) => (
              <tr key={opt.id} className="border-border-default border-b">
                <td className="text-text-primary py-2 pr-4 font-medium">
                  {(opt.coverage_amount_cents / 100).toFixed(0)}
                </td>
                <td className="py-2 pr-4">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(opt.surcharge_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_INSURANCE_SURCHARGE",
                        index: i,
                        surcharge_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                      })
                    }
                    className="w-24 py-1.5 text-sm"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={opt.is_active}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_INSURANCE_ACTIVE",
                        index: i,
                        is_active: e.target.checked,
                      })
                    }
                    className="text-primary-500 focus:ring-primary-500 border-border-default h-4 w-4 rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
