import { getT } from "@/i18n/server";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">{t.common.notFound}</h1>
      <ButtonLink href="/" variant="secondary" size="sm" className="mt-6">
        {t.nav.home}
      </ButtonLink>
    </div>
  );
}
