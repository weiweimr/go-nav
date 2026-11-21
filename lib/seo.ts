import type { Metadata } from "next";
import type { NavCategory, NavConfig, NavSite } from "@/types";
import {
	buildCategoryPath,
	getCategoryAncestors,
	type CategoryPageEntry,
} from "@/lib/category-pages";
import {
	collectSiteDetailEntries,
	resolveSiteDetailPreviewImages,
	type SiteDetailEntry,
} from "@/lib/site-detail";

const DEFAULT_SITE_URL = "https://nav.gotab.cn";
const DEFAULT_OG_IMAGE = "/images/logo.png";

type SeoNav = Pick<
	NavConfig,
	| "title"
	| "name"
	| "description"
	| "keywords"
	| "logo"
	| "favicon"
	| "author"
	| "copyright"
	| "accessProtection"
	| "layout"
>;

export function resolveSiteOrigin(): string {
	const raw =
		process.env.NEXT_PUBLIC_SITE_URL ||
		process.env.SITE_URL ||
		DEFAULT_SITE_URL;
	try {
		const url = new URL(raw);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return DEFAULT_SITE_URL;
		}
		return url.origin;
	} catch {
		return DEFAULT_SITE_URL;
	}
}

export function toAbsoluteUrl(
	raw: string | undefined,
	origin = resolveSiteOrigin(),
): string | undefined {
	const value = raw?.trim();
	if (!value) return undefined;

	if (value.startsWith("//")) {
		return `${origin.split("://")[0]}:${value}`;
	}
	try {
		const url = new URL(value);
		if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
		return url.toString();
	} catch {
		if (!value.startsWith("/")) return undefined;
		return `${origin}${value}`;
	}
}

function withTrailingSlash(path: string): string {
	if (!path || path === "/" || path.endsWith("/")) return path || "/";
	const [pathname, query] = path.split("?");
	return `${pathname}/${query ? `?${query}` : ""}`;
}

function normalizeKeywords(keywords: string[] | undefined): string[] {
	const list = (keywords ?? []).flatMap((item) =>
		item.split(/[,，、]/).map((part) => part.trim()),
	);
	return Array.from(new Set(list.filter(Boolean)));
}

function truncate(value: string, max: number): string {
	const chars = Array.from(value.trim());
	return chars.length <= max ? chars.join("") : `${chars.slice(0, max).join("")}…`;
}

function stripMarkdown(value: string): string {
	return value
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`([^`]*)`/g, "$1")
		.replace(/!\[[^\]]*]\([^)]*\)/g, " ")
		.replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s+/gm, "")
		.replace(/^\s{0,3}>\s?/gm, "")
		.replace(/[*_~]/g, "")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function siteName(nav: SeoNav): string {
	return nav.name?.trim() || "Go Nav";
}

function siteTitle(nav: SeoNav): string {
	return nav.title?.trim() || siteName(nav);
}

function siteDescription(nav: SeoNav): string {
	return truncate(nav.description?.trim() || `${siteName(nav)} - 精选网站导航`, 160);
}

function defaultOgImage(): string {
	return toAbsoluteUrl(DEFAULT_OG_IMAGE) ?? `${resolveSiteOrigin()}${DEFAULT_OG_IMAGE}`;
}

function robotsPolicy(nav: SeoNav): Metadata["robots"] {
	return nav.accessProtection?.enabled === true
		? { index: false, follow: false }
		: { index: true, follow: true };
}

function detailDescription(
	nav: SeoNav,
	entry: SiteDetailEntry,
): string {
	const markdown = stripMarkdown(entry.site.detailMarkdown ?? "");
	const fallback = [
		entry.site.title,
		entry.categoryPath.join(" / "),
		siteName(nav),
	]
		.filter(Boolean)
		.join(" - ");
	return truncate(markdown || entry.site.description?.trim() || fallback, 160);
}

function detailPreviewImages(entry: SiteDetailEntry): string[] {
	return resolveSiteDetailPreviewImages(entry.site)
		.map((image) => toAbsoluteUrl(image))
		.filter((image): image is string => Boolean(image));
}

export function buildRootMetadata(nav: SeoNav): Metadata {
	const name = siteName(nav);
	const title = siteTitle(nav);
	const description = siteDescription(nav);
	const keywords = normalizeKeywords(nav.keywords);
	const ogImage = defaultOgImage();

	return {
		metadataBase: new URL(resolveSiteOrigin()),
		title,
		applicationName: name,
		description,
		keywords: keywords.length > 0 ? keywords : undefined,
		authors: nav.author?.trim() ? [{ name: nav.author.trim() }] : undefined,
		creator: nav.author?.trim() || undefined,
		publisher: nav.author?.trim() || undefined,
		icons: nav.favicon?.trim() ? { icon: nav.favicon.trim() } : undefined,
		alternates: { canonical: "/" },
		openGraph: {
			type: "website",
			locale: "zh_CN",
			url: "/",
			siteName: name,
			title,
			description,
			images: [{ url: ogImage, alt: name }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImage],
		},
		robots: robotsPolicy(nav),
		other: nav.copyright?.trim()
			? { copyright: nav.copyright.trim() }
			: undefined,
	};
}

export function buildDetailMetadata(
	nav: SeoNav,
	entry: SiteDetailEntry,
): Metadata {
	const name = siteName(nav);
	const title = `${entry.site.title} - ${entry.categoryName} | ${name}`;
	const description = detailDescription(nav, entry);
	const canonical = withTrailingSlash(entry.path);
	const images = detailPreviewImages(entry);
	const keywords = normalizeKeywords([
		...(entry.site.tags ?? []),
		entry.site.title,
		entry.categoryName,
	]);

	return {
		title,
		description,
		keywords: keywords.length > 0 ? keywords : undefined,
		alternates: { canonical },
		openGraph: {
			type: "website",
			locale: "zh_CN",
			url: canonical,
			siteName: name,
			title,
			description,
			images: (images.length > 0 ? images : [defaultOgImage()]).map((url) => ({
				url,
				alt: entry.site.title,
				width: 1280,
				height: 900,
			})),
		},
		twitter: {
			card: images.length > 0 ? "summary_large_image" : "summary",
			title,
			description,
			images: images.length > 0 ? images : [defaultOgImage()],
		},
		robots: robotsPolicy(nav),
	};
}

function webSiteJsonLd(nav: SeoNav) {
	const origin = resolveSiteOrigin();
	const name = siteName(nav);
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${origin}/#website`,
		url: `${origin}/`,
		name,
		alternateName: nav.title?.trim() || undefined,
		description: siteDescription(nav),
		inLanguage: "zh-CN",
		publisher: nav.author?.trim()
			? { "@type": "Organization", name: nav.author.trim() }
			: undefined,
	};
}

function homeItemListJsonLd(nav: SeoNav, categories: NavCategory[]) {
	if (nav.layout?.enableSiteDetailPage !== true) return null;
	const entries = collectSiteDetailEntries(categories);
	if (entries.length === 0) return null;

	return {
		"@context": "https://schema.org",
		"@type": "ItemList",
		"@id": `${resolveSiteOrigin()}/#site-index`,
		name: `${siteName(nav)} 网址索引`,
		numberOfItems: entries.length,
		itemListElement: entries.map((entry, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: entry.site.title,
			url: `${resolveSiteOrigin()}${withTrailingSlash(entry.path)}`,
		})),
	};
}

function detailWebPageJsonLd(nav: SeoNav, entry: SiteDetailEntry) {
	const origin = resolveSiteOrigin();
	const url = `${origin}${withTrailingSlash(entry.path)}`;
	const description = detailDescription(nav, entry);
	const images = detailPreviewImages(entry);
	const breadcrumb = [
		{
			"@type": "ListItem",
			position: 1,
			name: siteName(nav),
			item: `${origin}/`,
		},
		...entry.categoryPath.map((name, index) => ({
			"@type": "ListItem",
			position: index + 2,
			name,
			item: `${origin}${withTrailingSlash(
				buildCategoryPath(entry.categoryAncestorIds[index] ?? name),
			)}`,
		})),
		{
			"@type": "ListItem",
			position: entry.categoryPath.length + 2,
			name: entry.site.title,
			item: url,
		},
	];

	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `${url}#webpage`,
		url,
		name: `${entry.site.title} - ${siteName(nav)}`,
		description,
		inLanguage: "zh-CN",
		isPartOf: {
			"@type": "WebSite",
			"@id": `${origin}/#website`,
			url: `${origin}/`,
			name: siteName(nav),
		},
		breadcrumb: {
			"@type": "BreadcrumbList",
			itemListElement: breadcrumb,
		},
		image: images.length > 0 ? images : undefined,
		mainEntity: {
			"@type": "SoftwareApplication",
			"@id": `${url}#site`,
			name: entry.site.title,
			description: entry.site.description?.trim() || description,
			url: entry.site.url,
			sameAs: entry.site.url,
			applicationCategory: "WebApplication",
			operatingSystem: "Web",
			image: images[0] ?? undefined,
		},
	};
}

export function buildJsonLd(
	nodes: Array<Record<string, unknown> | null | undefined>,
): string | null {
	const filtered = nodes.filter(
		(node): node is Record<string, unknown> => Boolean(node),
	);
	if (filtered.length === 0) return null;

	const graph = filtered.map((node) => {
		const copy = { ...node };
		delete copy["@context"];
		return copy;
	});
	const payload = { "@context": "https://schema.org", "@graph": graph };

	return JSON.stringify(payload)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026");
}

export function buildHomeJsonLd(nav: SeoNav, categories: NavCategory[]) {
	return buildJsonLd([webSiteJsonLd(nav), homeItemListJsonLd(nav, categories)]);
}

export function buildDetailJsonLd(nav: SeoNav, entry: SiteDetailEntry) {
	return buildJsonLd([webSiteJsonLd(nav), detailWebPageJsonLd(nav, entry)]);
}

function categoryDescription(nav: SeoNav, entry: CategoryPageEntry): string {
	const configured = entry.description?.trim();
	if (configured) return truncate(configured, 160);
	return truncate(
		`${entry.name}分类收录了 ${siteName(nav)} 的 ${entry.siteCount} 个精选站点，集中发现相关工具、服务与优质网址。`,
		160,
	);
}

export function buildCategoryMetadata(
	nav: SeoNav,
	entry: CategoryPageEntry,
): Metadata {
	const name = siteName(nav);
	const title = `${entry.name} - ${name}`;
	const description = categoryDescription(nav, entry);
	const canonical = withTrailingSlash(entry.path);
	const keywords = normalizeKeywords([
		entry.name,
		...(entry.category.sites ?? []).flatMap((site) => site.tags ?? []).slice(0, 8),
	]);

	return {
		title,
		description,
		keywords: keywords.length > 0 ? keywords : undefined,
		alternates: { canonical },
		openGraph: {
			type: "website",
			locale: "zh_CN",
			url: canonical,
			siteName: name,
			title,
			description,
			images: [{ url: defaultOgImage(), alt: name }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [defaultOgImage()],
		},
		robots: robotsPolicy(nav),
	};
}

function categoryCollectionJsonLd(
	nav: SeoNav,
	entry: CategoryPageEntry,
	allEntries: CategoryPageEntry[],
	sites: NavSite[],
) {
	const origin = resolveSiteOrigin();
	const url = `${origin}${withTrailingSlash(entry.path)}`;
	const ancestors = getCategoryAncestors(allEntries, entry);
	const breadcrumb = [
		{
			"@type": "ListItem",
			position: 1,
			name: siteName(nav),
			item: `${origin}/`,
		},
		...ancestors.map((item, index) => ({
			"@type": "ListItem",
			position: index + 2,
			name: item.name,
			item: `${origin}${withTrailingSlash(item.path)}`,
		})),
	];

	return {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		"@id": `${url}#webpage`,
		url,
		name: `${entry.name} - ${siteName(nav)}`,
		description: categoryDescription(nav, entry),
		inLanguage: "zh-CN",
		isPartOf: {
			"@type": "WebSite",
			"@id": `${origin}/#website`,
			url: `${origin}/`,
			name: siteName(nav),
		},
		breadcrumb: {
			"@type": "BreadcrumbList",
			itemListElement: breadcrumb,
		},
		mainEntity: {
			"@type": "ItemList",
			"@id": `${url}#sites`,
			name: `${entry.name}站点列表`,
			numberOfItems: sites.length,
			itemListElement: sites.map((site, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: site.title,
				url: site.url,
			})),
		},
	};
}

export function buildCategoryJsonLd(
	nav: SeoNav,
	entry: CategoryPageEntry,
	allEntries: CategoryPageEntry[],
	sites: NavSite[],
) {
	return buildJsonLd([
		webSiteJsonLd(nav),
		categoryCollectionJsonLd(nav, entry, allEntries, sites),
	]);
}
