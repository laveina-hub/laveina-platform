"use client";

import { CheckCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Button, Heading, Input, Label, Select, Text } from "@/components/atoms";

export function ContactForm() {
  const t = useTranslations("contactPage");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-success/10 mb-5 flex h-16 w-16 items-center justify-center rounded-full">
          <CheckCircle className="text-success h-8 w-8" />
        </div>
        <Heading variant="card" as="h3" className="mb-2">
          {t("successTitle")}
        </Heading>
        <Text variant="body" className="text-text-light max-w-sm">
          {t("successText")}
        </Text>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="contact-name">{t("nameLabel")}</Label>
        <Input
          id="contact-name"
          name="name"
          type="text"
          placeholder={t("namePlaceholder")}
          required
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="contact-email">{t("emailLabel")}</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          required
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="contact-subject">{t("subjectLabel")}</Label>
        <Select id="contact-subject" name="subject" required className="mt-1.5">
          <option value="">{t("subjectPlaceholder")}</option>
          <option value="general">{t("subjectGeneral")}</option>
          <option value="support">{t("subjectSupport")}</option>
          <option value="partnership">{t("subjectPartnership")}</option>
          <option value="business">{t("subjectBusiness")}</option>
          <option value="other">{t("subjectOther")}</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="contact-message">{t("messageLabel")}</Label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder={t("messagePlaceholder")}
          required
          className="border-border-default focus:ring-primary/20 focus:border-primary mt-1.5 w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm transition-colors focus:ring-2 focus:outline-none"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full gap-2">
        <Send className="h-4 w-4" />
        {t("submitButton")}
      </Button>
    </form>
  );
}
