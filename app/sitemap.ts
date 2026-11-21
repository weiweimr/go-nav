import type { MetadataRoute } from "next";
import { collectCategoryPageEntries } from "@/lib/category-pages";
import { getNav, getWebsiteData } from "@/lib/config";
import { getDataLastModified } from "@/lib/data-meta";
import { resolveSiteOrigin } from "@/lib/seo";
import { collectSiteDetailEntries } from "@/lib/site-detail";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
	const origin = resolveSiteOrigin();
	const lastModified = getDataLastModified();
	const home: MetadataRoute.Sitemap = [
		{
			url: `${origin}/`,
			lastModified,
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

	for (const category of collectCategoryPageEntries(websiteData.categories)) {
		urls.push({
			url: `${origin}${category.path}/`,
			lastModified,
			changeFrequency: "weekly",
			priority: 0.8,
		});
	}

	for (const entry of detailEntries) {
		urls.push({
			url: `${origin}${entry.path}/`,
			lastModified,
			changeFrequency: "weekly",
			priority: 0.7,
		});
	}

	return urls;
}
