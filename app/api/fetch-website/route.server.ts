import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/server/auth";
import {
	fetchPublicResource,
	normalizeHttpUrl,
	readResponseBytes,
} from "@/lib/server/fetch-utils";
import {
	buildFaviconFallbackUrls,
	findFaviconCandidates,
	isChallengePage,
	saveFaviconFromUrl,
} from "@/lib/server/favicon";

const MAX_HTML_SIZE = 2 * 1024 * 1024;
const REQUEST_TIMEOUT = 20_000;

function extractPrimaryTitle(rawTitle: string): string {
	const normalized = rawTitle.replace(/\s+/g, " ").trim();
	if (!normalized) return "";
	const [primary] = normalized.split(/\s*(?:——|—|｜|\||_|-|（|\(|，|,)\s*/);
	return primary?.trim() || normalized;
}

/**
 * 获取网站 HTML 并解析 title、favicon 等信息。
 * POST /api/fetch-website
 * Body: { url: string, fetchIcon?: boolean }
 * 默认自动下载图标并返回本地模式下的 /uploads/... URL。
 */
export async function POST(req: Request) {
	const store = await cookies();
	if (!verifySession(store.get(SESSION_COOKIE)?.value)) {
		return NextResponse.json({ error: "未登录" }, { status: 401 });
	}

	try {
		const body = (await req.json()) as {
			url?: string;
			fetchIcon?: boolean;
		};
		const targetUrl = body?.url;
		if (!targetUrl) {
			return NextResponse.json({ error: "缺少 url" }, { status: 400 });
		}

		const target = normalizeHttpUrl(targetUrl);
		const host = target.hostname;

		// HTML 抓取与图标抓取解耦：机器验证站点常拦截页面 HTML，
		// 但仍需尽量拿到图标。所以 HTML 失败只记录，不立即返回错误。
		let html = "";
		let finalUrl = target.href;
		let htmlError = "";
		let blocked = false;

		try {
			const res = await fetchPublicResource(target, {
				method: "GET",
				timeoutMs: REQUEST_TIMEOUT,
				maxBytes: MAX_HTML_SIZE,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
					Accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
				},
			});
			if (!res.ok) {
				htmlError = `HTTP ${res.status}`;
				blocked = true;
			} else {
				const bytes = await readResponseBytes(res, MAX_HTML_SIZE);
				html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
				finalUrl = res.url || target.href;
				blocked = isChallengePage(html);
				if (blocked) html = ""; // 验证页不是站点真实内容，丢弃解析结果。
			}
		} catch (e) {
			htmlError = (e as Error).message || "页面抓取失败";
			blocked = true;
		}

		const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		const rawTitle = titleMatch?.[1]?.trim() || "";
		const title = extractPrimaryTitle(rawTitle);

		let iconUrl: string | null = null;
		if (body.fetchIcon !== false) {
			const iconHost = new URL(finalUrl).hostname || host;
			const fileNamePrefix = `favicon-${iconHost}`;

			// 1) 页面正常时优先用站点声明的高质量图标。
			if (!blocked && html) {
				for (const candidate of findFaviconCandidates(html, finalUrl)) {
					try {
						iconUrl = await saveFaviconFromUrl(candidate, {
							fileNamePrefix,
						});
						break;
					} catch {
						// 当前候选不可用（含被验证拦截），继续尝试其它候选。
					}
				}
			}

			// 2) 页面没声明、候选全失败或命中机器验证时，按域名从图标缓存服务回退。
			if (!iconUrl) {
				for (const fallback of buildFaviconFallbackUrls(iconHost)) {
					try {
						iconUrl = await saveFaviconFromUrl(fallback, {
							fileNamePrefix,
						});
						break;
					} catch {
						// 尝试下一个回退源。
					}
				}
			}
		}

		let description = "";
		let keywords: string[] = [];
		if (html) {
			const descriptionMatch = html.match(
				/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
			) ||
				html.match(
					/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
				);
			description = descriptionMatch?.[1]?.trim() || "";

			const keywordsMatch = html.match(
				/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i,
			) ||
				html.match(
					/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']keywords["']/i,
				);
			keywords = keywordsMatch?.[1]
				?.split(/[,，]/)
				.map((s) => s.trim())
				.filter(Boolean) || [];
		}

		// 页面被拦截但图标回退成功时也返回成功，让前端能填入图标。
		if (!title && !iconUrl && !description && keywords.length === 0) {
			return NextResponse.json(
				{
					error: blocked
						? `目标站点触发了机器验证，无法获取网站信息${htmlError ? `（${htmlError}）` : ""}`
						: htmlError || "未获取到网站信息",
				},
				{ status: 400 },
			);
		}

		return NextResponse.json({
			title,
			iconUrl,
			description,
			keywords,
			blocked,
		});
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message || "获取失败" },
			{ status: 500 },
		);
	}
}
