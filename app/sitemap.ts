import type { MetadataRoute } from "next";
import { getNav, getWebsiteData } from "@/lib/config";
import { resolveSiteOrigin } from "@/lib/seo";
import { collectSiteDetailEntries } from "@/lib/site-detail";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
	const origin = resolveSiteOrigin();
	const now = new Date();
	const home: MetadataRoute.Sitemap = [
		{
			url: `${origin}/`,
			lastModified: now,
			changeFrequency: "daily",
			priority: 1,
		},
	];

	// html 模式的数据由浏览器运行时读取，构建阶段只能稳定生成首页条目。
	if ((process.env.BUILD_MODE || "server").toLowerCase() === "html") {
		return home;
	}

	const nav = getNav();
	if (nav.accessProtection?.enabled === true) {
		return home;
	}
	const detailEnabled = nav.layout?.enableSiteDetailPage === true;
	const websiteData = getWebsiteData();
	const detailEntries = detailEnabled
		? collectSiteDetailEntries(websiteData.categories)
		: [];
	const urls = home;

	for (const entry of detailEntries) {
		urls.push({
			url: `${origin}${entry.path}/`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.7,
		});
	}

	return urls;
}
