import type { Metadata } from "next";
import SeoLandingPage from "../../components/SeoLandingPage";
import { landingPageMetadata, seoLandingPages } from "../../lib/seo";

const page = seoLandingPages["salary-cap-golf-pool"];

export const metadata: Metadata = landingPageMetadata(page);

export default function Page() {
  return <SeoLandingPage page={page} />;
}
