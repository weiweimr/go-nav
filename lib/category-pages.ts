import type { NavCategory } from "@/types";

/** 分类落地页的统一前缀。 */
export const CATEGORY_BASE_PATH = "/category";

/**
 * 分类 id 可能包含中文、emoji 或空格，直接用它做静态路由目录会带来
 * 跨平台/部署兼容问题。这里保留纯 ASCII id，其余用稳定短哈希生成 slug，
 * 保证同一分类每次构建得到同一个可访问 URL。
 */
export function buildCategorySlug(id: string): string {
	const trimmed = id.trim();
	if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
	return `cat-${stableHash(trimmed)}`;
}

export function buildCategoryPath(id: string): string {
	return `${CATEGORY_BASE_PATH}/${buildCategorySlug(id)}`;
}

export interface CategoryPageEntry {
	/** 原始数据中的分类 id */
	id: string;
	/** URL 安全的路由参数 */
	slug: string;
	name: string;
	description?: string;
	icon?: string;
	path: string;
	depth: number;
	parentId?: string;
	childrenIds: string[];
	/** 含所有后代分类的站点总数 */
	siteCount: number;
	category: NavCategory;
}

export function countCategorySites(category: NavCategory): number {
	const own = category.sites?.length ?? 0;
	const children = category.children ?? [];
	return own + children.reduce((sum, child) => sum + countCategorySites(child), 0);
}

/** 递归收集所有分类（一级与子分类）的落地页信息。 */
export function collectCategoryPageEntries(
	categories: NavCategory[],
): CategoryPageEntry[] {
	const list: CategoryPageEntry[] = [];

	const walk = (nodes: NavCategory[], depth: number, parentId?: string) => {
		for (const node of nodes) {
			list.push({
				id: node.id,
				slug: buildCategorySlug(node.id),
				name: node.name,
				description: node.description,
				icon: node.icon,
				path: buildCategoryPath(node.id),
				depth,
				parentId,
				childrenIds: (node.children ?? []).map((child) => child.id),
				siteCount: countCategorySites(node),
				category: node,
			});
			if (node.children?.length) {
				walk(node.children, depth + 1, node.id);
			}
		}
	};

	walk(categories, 0);
	return list;
}

export function findCategoryPageEntry(
	entries: CategoryPageEntry[],
	id: string,
): CategoryPageEntry | null {
	return entries.find((entry) => entry.id === id) ?? null;
}

export function findCategoryPageEntryBySlug(
	entries: CategoryPageEntry[],
	slug: string,
): CategoryPageEntry | null {
	return entries.find((entry) => entry.slug === slug) ?? null;
}

/** 当前分类的祖先链（不含自身），按根到父的顺序返回。 */
export function getCategoryAncestors(
	entries: CategoryPageEntry[],
	entry: CategoryPageEntry,
): CategoryPageEntry[] {
	const byId = new Map(entries.map((item) => [item.id, item]));
	const result: CategoryPageEntry[] = [];
	let parentId = entry.parentId;
	while (parentId) {
		const parent = byId.get(parentId);
		if (!parent) break;
		result.unshift(parent);
		parentId = parent.parentId;
	}
	return result;
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
