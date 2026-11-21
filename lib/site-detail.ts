import type { NavCategory, NavSite } from "@/types";

export interface SiteDetailEntry {
	slug: string;
	path: string;
	site: NavSite;
	categoryId: string;
	categoryName: string;
	categoryPath: string[];
	/** 与 categoryPath 一一对应的分类 id，用于生成可见/结构化面包屑链接。 */
	categoryAncestorIds: string[];
}

const SITE_DETAIL_BASE_PATH = "/site";

export const MAX_SITE_DETAIL_PREVIEW_IMAGES = 8;

export const MAX_RELATED_SITE_RECOMMENDATIONS = 6;

/**
 * 清理详情页多图配置。运行时 JSON 可能绕过 TypeScript，因此这里仍做类型检查。
 */
export function normalizeSitePreviewImages(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	const result: string[] = [];
	const seen = new Set<string>();
	for (const item of value) {
		if (typeof item !== "string") continue;
		const url = item.trim();
		if (!url || seen.has(url)) continue;
		seen.add(url);
		result.push(url);
		if (result.length >= MAX_SITE_DETAIL_PREVIEW_IMAGES) break;
	}
	return result;
}

/**
 * 详情页优先展示 previewImages；没有有效数组时兼容旧的 previewImage 单图。
 */
export function resolveSiteDetailPreviewImages(
	site: Pick<NavSite, "previewImage" | "previewImages">,
): string[] {
	const images = normalizeSitePreviewImages(site.previewImages);
	if (images.length > 0) return images;

	const legacyImage =
		typeof site.previewImage === "string" ? site.previewImage.trim() : "";
	return legacyImage ? [legacyImage] : [];
}

export function buildSiteDetailSlug(
	site: Pick<NavSite, "id" | "title" | "url">,
): string {
	const base =
		slugify(site.id || "") ||
		slugify(site.title || "") ||
		slugify(extractUrlHost(site.url)) ||
		"site";
	const hash = stableHash(site.url || `${site.id || ""}-${site.title || ""}`);
	return `${base}-${hash}`;
}

export function buildSiteDetailPath(
	site: Pick<NavSite, "id" | "title" | "url">,
): string {
	const slug = buildSiteDetailSlug(site);
	if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "html") {
		return `/?site=${encodeURIComponent(slug)}`;
	}
	return `${SITE_DETAIL_BASE_PATH}/${slug}`;
}

export function collectSiteDetailEntries(
	categories: NavCategory[],
): SiteDetailEntry[] {
	const list: SiteDetailEntry[] = [];
	const seen = new Set<string>();

	const walk = (nodes: NavCategory[], parents: string[], parentIds: string[]) => {
		for (const node of nodes) {
			const currentPath = [...parents, node.name];
			const currentIds = [...parentIds, node.id];
			if (node.sites && node.sites.length > 0) {
				for (const site of node.sites) {
					const slug = buildSiteDetailSlug(site);
					if (seen.has(slug)) continue;
					seen.add(slug);
					list.push({
						slug,
						path: buildSiteDetailPath(site),
						site,
						categoryId: node.id,
						categoryName: node.name,
						categoryPath: currentPath,
						categoryAncestorIds: currentIds,
					});
				}
			}
			if (node.children && node.children.length > 0) {
				walk(node.children, currentPath, currentIds);
			}
		}
	};

	walk(categories, [], []);
	return list;
}

export function findSiteDetailEntryBySlug(
	entries: SiteDetailEntry[],
	slug: string,
): SiteDetailEntry | null {
	const exact = entries.find((item) => item.slug === slug);
	if (exact) return exact;

	const hash = extractSlugHash(slug);
	if (!hash) return null;

	const matches = entries.filter((item) => extractSlugHash(item.slug) === hash);
	if (matches.length === 1) return matches[0];
	return null;
}

function extractUrlHost(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}

function slugify(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

/**
 * 从同一分类中挑选相关推荐（排除当前站点自身）。
 *
 * 使用以 slug 与 batch 为种子的确定性洗牌，而不是 Math.random()：
 * - 静态导出与客户端首屏渲染结果一致，避免 hydration 不匹配；
 * - 不同详情页因种子不同得到不同的推荐组合，视觉上是"随机"的；
 * - 点击"换一批"递增 batch 即可在客户端换一组，不改变服务端产物。
 */
export function pickRelatedSiteEntries(
	entries: SiteDetailEntry[],
	current: SiteDetailEntry,
	limit = MAX_RELATED_SITE_RECOMMENDATIONS,
	batch = 0,
): SiteDetailEntry[] {
	const candidates = entries.filter(
		(item) =>
			item.slug !== current.slug && item.categoryId === current.categoryId,
	);
	if (candidates.length === 0) return [];

	const seed = parseInt(stableHash(`${current.slug}|${batch}`), 36) >>> 0;
	const shuffled = seededShuffle(candidates, seed);
	return shuffled.slice(0, Math.max(0, limit));
}

/** Fisher-Yates 洗牌，随机数由确定性种子生成。 */
function seededShuffle<T>(items: T[], seed: number): T[] {
	const result = [...items];
	let state = seed || 1;
	for (let i = result.length - 1; i > 0; i--) {
		// xorshift32
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		state >>>= 0;
		const j = state % (i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function extractSlugHash(slug: string): string {
	const idx = slug.lastIndexOf("-");
	if (idx <= 0 || idx >= slug.length - 1) return "";
	return slug.slice(idx + 1);
}

function stableHash(value: string): string {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash +=
			(hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}
	return (hash >>> 0).toString(36);
}
