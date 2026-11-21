import type { MetadataRoute } from "next";
import { getNav } from "@/lib/config";
import { resolveSiteOrigin } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
	const origin = resolveSiteOrigin();
	const nav = getNav();
	const sitemap = `${origin}/sitemap.xml`;

	if (nav.accessProtection?.enabled === true) {
		return {
			rules: { userAgent: "*", disallow: "/" },
			sitemap,
			host: origin,
		};
	}

	const disallow = ["/api/", "/admin/", "/site/__placeholder__/"];
	if ((process.env.BUILD_MODE || "server").toLowerCase() === "html") {
		disallow.push("/*?site=");
	}

	return {
		rules: { userAgent: "*", allow: "/", disallow },
		sitemap,
		host: origin,
	};
}
// ESA rebuild trigger 2026-11-21
