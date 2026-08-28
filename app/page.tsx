import type { Metadata } from "next";
import { getDoctorsAction } from "@/app/actions/doctors.actions";
import { HomeContent } from "@/components/home/HomeContent";

export const metadata: Metadata = {
  title: "مركز أسما للصحة النفسية | استشارات نفسية أونلاين وحضورية",
  description:
    "استشارات نفسية وعلاج معرفي سلوكي بإشراف نخبة من الاستشاريين المعتمدين. احجز جلسة أونلاين عبر زووم أو زيارة حضورية بمقر العيادة.",
};

/**
 * Landing page.
 *
 * A thin server shell: it fetches the consultant roster and hands it to the
 * presentational component. The page previously read doctors out of a
 * client-side mock store, so the "featured consultant" on the clinic's own home
 * page was a fixture rather than a real, bookable person.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getDoctorsAction();

  // The marketing page must render even if the database is unreachable — a
  // failed query costs the doctor grid, not the whole site.
  const doctors = result.ok ? result.data : [];

  return <HomeContent doctors={doctors} />;
}
