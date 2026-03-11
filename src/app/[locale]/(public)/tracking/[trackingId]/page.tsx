import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; trackingId: string }>;
};

export default async function TrackingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <h1>Tracking</h1>
    </div>
  );
}
