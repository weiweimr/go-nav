"use client";

import { Button, Chip } from "@heroui/react";
import { useCallback, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { BiArrowBack, BiLinkExternal, BiRefresh } from "react-icons/bi";
import { usePageNavigation } from "@/components/page-navigation";
import { SiteCard } from "@/components/site-card";
import type { LayoutConfig } from "@/types";
import { recordVisit } from "@/hooks/use-recent-visits";
import {
	openSiteWithPreference,
	useSiteLinkMode,
} from "@/lib/client/site-link";
import { requestHomeRestore } from "@/lib/client/home-restore";
import { withAuthorBaiduTracking } from "@/lib/external-url";
import { categoriesAtom } from "@/lib/store/site";
import {
	MAX_RELATED_SITE_RECOMMENDATIONS,
	collectSiteDetailEntries,
	pickRelatedSiteEntries,
	resolveSiteDetailPreviewImages,
	type SiteDetailEntry,
} from "@/lib/site-detail";
import { SiteIcon } from "../site-icon";
import { SiteDetailGallery } from "./site-detail-gallery";
import { SiteDetailMarkdown } from "./site-detail-markdown";

export function SiteDetailPage({
	entry,
	layout,
}: {
	entry: SiteDetailEntry;
	layout: Required<LayoutConfig>;
}) {
	const navigate = usePageNavigation();
	const siteLinkMode = useSiteLinkMode();
	const categories = useAtomValue(categoriesAtom);
	const [relatedBatch, setRelatedBatch] = useState(0);
	const site = entry.site;
	const tags = site.tags?.filter((tag) => tag.trim()) ?? [];
	const previewImages = resolveSiteDetailPreviewImages(site);
	const detailMarkdown = site.detailMarkdown?.trim() ?? "";
	const detailIconLayout = { ...layout, iconBorderRadius: "12px" };
	const relatedEntries = useMemo(
		() =>
			pickRelatedSiteEntries(
				collectSiteDetailEntries(categories),
				entry,
				MAX_RELATED_SITE_RECOMMENDATIONS,
				relatedBatch,
			),
		[categories, entry, relatedBatch],
	);

	const handleBack = useCallback(() => {
		requestHomeRestore();
		navigate("/", { scroll: false });
	}, [navigate]);

	const handleVisit = useCallback(() => {
		recordVisit(site);
		void openSiteWithPreference(site, {
			linkTarget: layout.linkTarget,
			autoUseIntranet: layout.autoUseIntranet,
		});
	}, [layout.autoUseIntranet, layout.linkTarget, site]);

	return (
		<section className="w-full px-2 pb-6">
			<div className="mb-4 flex items-center gap-3">
				<Button
					isIconOnly
					variant="tertiary"
					onPress={handleBack}
					aria-label="返回首页"
				>
					<BiArrowBack />
				</Button>
				<h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
					网址详情
				</h2>
			</div>

			<div className="space-y-4">
				<div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900">
					<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-6">
						<div className="flex min-w-0 flex-col">
							<div className="flex min-w-0 items-center gap-4 sm:gap-5">
								<div className="flex size-18 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white p-2 sm:size-20 dark:border-white/12 dark:bg-zinc-900">
									<SiteIcon
										site={site}
										layout={detailIconLayout}
										size={56}
										showDefaultBackgroundColor={false}
										className="shrink-0 text-2xl!"
										initialClassName="text-base!"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
										<h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
											{site.title}
										</h1>
										{layout.showSiteDetailUrl ? (
											<a
												href={withAuthorBaiduTracking(site.url)}
												target="_blank"
												rel="noopener noreferrer"
												className="min-w-0 break-all text-sm leading-6 text-zinc-500 underline-offset-4 hover:text-primary hover:underline dark:text-zinc-400"
												title={site.url}
											>
												{site.url}
											</a>
										) : null}
									</div>
									{tags.length > 0 ? (
										<div className="mt-2.5 flex flex-wrap gap-2">
											{tags.map((tag) => (
												<Chip
													key={tag}
													size="sm"
													variant="secondary"
													className="text-xs!"
												>
													{tag}
												</Chip>
											))}
										</div>
									) : null}
								</div>
							</div>

							<div className="mt-5 grid gap-4 border-t border-black/8 pt-5 sm:grid-cols-2 dark:border-white/10">
								<div className="min-w-0">
									<span className="text-xs text-zinc-500 dark:text-zinc-400">
										分类
									</span>
									<p className="mt-1.5 text-sm leading-6 text-zinc-800 dark:text-zinc-200">
										{entry.categoryPath.join(" / ")}
									</p>
								</div>
								<div className="flex min-w-0 items-end sm:justify-end">
									<Button variant="primary" onPress={handleVisit}>
										<BiLinkExternal />
										访问链接
									</Button>
								</div>
							</div>

							{site.description && !detailMarkdown ? (
								<div className="mt-5 border-t border-black/8 pt-5 dark:border-white/10">
									<h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
										网址描述
									</h2>
									<p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-600 dark:text-zinc-300">
										{site.description}
									</p>
								</div>
							) : null}
						</div>

						{previewImages.length > 0 ? (
							<div className="flex min-w-0 flex-col self-start">
								<div className="mb-3 flex items-center justify-between gap-3">
									<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
										预览图
									</h2>
									<span className="text-xs text-zinc-500 dark:text-zinc-400">
										{previewImages.length} 张
									</span>
								</div>
								<SiteDetailGallery images={previewImages} title={site.title} />
							</div>
						) : null}
					</div>
				</div>

				{detailMarkdown ? (
					<div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900">
						<h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
							详细介绍
						</h2>
						<SiteDetailMarkdown markdown={detailMarkdown} />
					</div>
				) : null}

				{relatedEntries.length > 0 ? (
					<div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900">
						<div className="mb-4 flex items-center justify-between gap-3">
							<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
								相关推荐
								<span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
									同分类 · {entry.categoryName}
								</span>
							</h2>
							<Button
								isIconOnly
								size="sm"
								variant="tertiary"
								onPress={() => setRelatedBatch((value) => value + 1)}
								aria-label="换一批相关推荐"
							>
								<BiRefresh />
							</Button>
						</div>
						<div
							className="grid gap-3"
							style={{
								gridTemplateColumns:
									"repeat(auto-fill, minmax(180px, 1fr))",
							}}
						>
							{relatedEntries.map((item) => (
								<SiteCard
									key={item.slug}
									site={item.site}
									trackVisit={false}
									layout={layout}
									siteLinkMode={siteLinkMode}
								/>
							))}
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}
