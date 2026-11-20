import { getWeeklyOffers } from "@/lib/weekly-cards";
import WeeklyOffers from "./WeeklyOffers";

export default async function WeeklyOffersTop() {
  return <WeeklyOffers offers={await getWeeklyOffers()} />;
}
