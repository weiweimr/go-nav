/**
 * CDN 动态缩图工具。
 *
 * 仅对白名单中的 CDN 域名（如七牛 t.wainiu.cn）图片追加缩略参数，
 * 让缩略展示位按需取小图，节省 CDN 流量；放大查看仍用原图。
 *
 * - 七牛 imageView2 语法：?imageView2/<mode>/w/<width>/q/<quality>/format/webp
 *   mode=2 表示等比缩放、不裁剪，观感无损。
 * - 外部图床 / 非 http(s) / 本地路径一律原样返回，避免拼出无效 URL。
 * - 已带 imageView2 参数的 URL 不重复追加。
 */

import type { ImageThumbnailConfig, NavConfig } from "@/types";

const DEFAULT_QUALITY = 80;
const DEFAULT_GALLERY_WIDTH = 640;
const DEFAULT_CARD_WIDTH = 480;

type ThumbnailScene = "gallery" | "card";

function normalizeHosts(config: ImageThumbnailConfig | undefined): Set<string> {
	const hosts = config?.hosts;
	if (!Array.isArray(hosts)) return new Set();
	return new Set(
		hosts
			.map((host) => host.trim().toLowerCase())
			.filter((host) => host.length > 0)
			// 兼容用户误填 https:// 前缀或带端口的写法
			.map((host) => host.replace(/^https?:\/\//, "").replace(/\/.*$/, "")),
	);
}

function sceneWidth(config: ImageThumbnailConfig | undefined, scene: ThumbnailScene) {
	const raw =
		scene === "gallery"
			? (config?.galleryWidth ?? DEFAULT_GALLERY_WIDTH)
			: (config?.cardWidth ?? DEFAULT_CARD_WIDTH);
	const width = Math.floor(Number(raw));
	return Number.isFinite(width) && width > 0
		? Math.min(Math.max(width, 64), 4096)
		: scene === "gallery"
			? DEFAULT_GALLERY_WIDTH
			: DEFAULT_CARD_WIDTH;
}

/**
 * 从 NavConfig 得到缩略图配置；未配置时返回 undefined（不缩图）。
 */
export function resolveImageThumbnailConfig(
	nav: NavConfig | undefined,
): ImageThumbnailConfig | undefined {
	const config = nav?.imageThumbnail;
	if (!config || config.enabled !== true) return undefined;
	return config;
}

/**
 * 生成展示用的缩略图 URL。
 *
 * @param src 原图 URL
 * @param config 缩略图配置（来自 resolveImageThumbnailConfig）
 * @param scene 展示场景，决定使用哪个宽度
 * @returns 缩略图 URL；不满足条件时返回原 src
 */
export function getThumbnailUrl(
	src: string | undefined | null,
	config: ImageThumbnailConfig | undefined,
	scene: ThumbnailScene = "gallery",
): string {
	if (!config || config.enabled !== true || !src) return src ?? "";
	const trimmed = src.trim();
	if (!trimmed) return src ?? "";

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		// 本地相对路径（如 /uploads/x.webp）不做处理
		return src;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return src;
	if (!normalizeHosts(config).has(url.hostname.toLowerCase())) return src;
	if (url.search.toLowerCase().includes("imageview2")) return src;

	const width = sceneWidth(config, scene);
	const qualityRaw = Math.floor(Number(config.quality ?? DEFAULT_QUALITY));
	const quality =
		Number.isFinite(qualityRaw) && qualityRaw > 0
			? Math.min(Math.max(qualityRaw, 1), 100)
			: DEFAULT_QUALITY;

	// imageView2 是路径式参数（无等号），须置于 query 首位；用字符串拼接避免
	// URL 序列化对斜杠等字符做意外编码。保留原有 query 与 hash。
	const thumbnail = `imageView2/2/w/${width}/q/${quality}/format/webp`;
	const queryIndex = trimmed.indexOf("?");
	const hashIndex = trimmed.indexOf("#");
	const baseEnd = hashIndex >= 0 ? hashIndex : trimmed.length;
	const base = trimmed.slice(0, queryIndex >= 0 && queryIndex < baseEnd ? queryIndex : baseEnd);
	const existingQuery =
		queryIndex >= 0 && queryIndex < baseEnd
			? trimmed.slice(queryIndex + 1, baseEnd)
			: "";
	const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : "";
	const query = existingQuery
		? `${thumbnail}&${existingQuery}`
		: thumbnail;
	return `${base}?${query}${hash}`;
}
