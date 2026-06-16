import type { MetadataRoute } from "next";
import { absoluteUrl, publicMarketingPaths } from "../lib/seo";

const priorityByPath: Record<string, number> = {
  "/": 1,
  "/golf-pools": 0.9,
  "/pga-golf-pool": 0.86,
  "/fantasy-golf-pool": 0.86,
  "/masters-golf-pool": 0.82,
  "/us-open-golf-pool": 0.82,
  "/salary-cap-golf-pool": 0.8,
  "/tiered-golf-pool": 0.8,
  "/pricing": 0.72,
  "/how": 0.68,
  "/live": 0.64,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return publicMarketingPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: (path === "/" ? "weekly" : "monthly") as
      | "weekly"
      | "monthly",
    priority: priorityByPath[path] ?? 0.5,
  }));
}
