import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer, Text } from "@/components/atoms";
import { ChevronIcon, ClockIcon, MailIcon, MapPinIcon } from "@/components/icons";

import { ContactForm } from "./ContactForm";

function InfoCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl bg-white/60 p-5 backdrop-blur-sm">
      <div className="bg-primary-100 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div>
        <span className="text-text-secondary text-sm font-semibold">{title}</span>
        <p className="text-text-light mt-0.5 text-sm">{value}</p>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="border-border-default group rounded-2xl border bg-white [&[open]>summary_.chevron]:rotate-180">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 md:px-8">
        <Heading variant="card" as="h3" className="text-base">
          {question}
        </Heading>
        <ChevronIcon
          direction="down"
          className="chevron text-text-light h-5 w-5 shrink-0 transition-transform duration-200"
        />
      </summary>
      <div className="px-6 pt-0 pb-5 md:px-8 md:pb-6">
        <Text variant="body" className="text-text-light">
          {answer}
        </Text>
      </div>
    </details>
  );
}

export async function ContactPageSection() {
  const t = await getTranslations("contactPage");

  return (
    <div className="bg-secondary-100">
      <section className="border-border-default border-b px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-2xl text-center">
            <Heading variant="page" as="h1">
              {t("heroTitle")}
            </Heading>
            <div className="bg-tertiary-50 mx-auto mt-4 h-1 w-16 rounded-full" />
            <Text variant="subtitle" className="text-text-light mt-6">
              {t("heroSubtitle")}
            </Text>
          </div>
        </SectionContainer>
      </section>

      <section className="border-border-default border-b px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-5 md:gap-12">
            <div className="border-border-default rounded-2xl border bg-white p-6 md:col-span-3 md:p-8">
              <Heading variant="card" as="h2" className="mb-6">
                {t("formTitle")}
              </Heading>
              <ContactForm />
            </div>

            <div className="space-y-4 md:col-span-2">
              <Heading variant="card" as="h2" className="mb-4">
                {t("infoTitle")}
              </Heading>
              <InfoCard
                icon={<MailIcon className="text-primary h-5 w-5" />}
                title={t("emailTitle")}
                value={t("emailValue")}
              />
              <InfoCard
                icon={<ClockIcon className="text-primary h-5 w-5" />}
                title={t("hoursTitle")}
                value={t("hoursValue")}
              />
              <InfoCard
                icon={<MapPinIcon className="text-primary h-5 w-5" />}
                title={t("locationTitle")}
                value={t("locationValue")}
              />
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
                {t("faqTitle")}
              </Heading>
              <div className="bg-tertiary-50 mx-auto mt-4 h-1 w-16 rounded-full" />
            </div>
            <div className="space-y-4">
              <FaqItem question={t("faq1Question")} answer={t("faq1Answer")} />
              <FaqItem question={t("faq2Question")} answer={t("faq2Answer")} />
              <FaqItem question={t("faq3Question")} answer={t("faq3Answer")} />
              <FaqItem question={t("faq4Question")} answer={t("faq4Answer")} />
            </div>
          </div>
        </SectionContainer>
      </section>
    </div>
  );
}
