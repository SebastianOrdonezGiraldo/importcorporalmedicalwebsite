import NotFoundContent from "@/components/NotFoundContent";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main><NotFoundContent /></main>
      <SiteFooter />
    </>
  );
}
