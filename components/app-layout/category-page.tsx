"use client";

import { Button } from "@heroui/react";
import { Fragment, useCallback } from "react";
import { BiArrowBack, BiChevronRight } from "react-icons/bi";
import { IconView } from "@/components/icon-view";
import { SiteGrid } from "@/components/site-card";
import type { CardGridModel } from "@/components/layout.types";
import { requestHomeRestore } from "@/lib/client/home-restore";
import {
	getCategoryAncestors,
	type CategoryPageEntry,
} from "@/lib/category-pages";
import { usePageNavigation } from "@/components/page-navigation";
import type { LayoutConfig } from "@/types";

export function CategoryPage({
	entry,
	entries,
	layout,
	cardGrid,
}: {
	entry: CategoryPageEntry;
	entries: CategoryPageEntry[];
	layout: Required<LayoutConfig>;
	cardGrid: CardGridModel;
}) {
	const navigate = usePageNavigation();
	const handleBack = useCallback(() => {
		requestHomeRestore();
		navigate("/", { scroll: false });
	}, [navigate]);

	const ancestors = getCategoryAncestors(entries, entry);
	const children = entries.filter((item) => item.parentId === entry.id);
	const ownSites = entry.category.sites ?? [];
	const siblings = entries.filter(
		(item) => item.depth === entry.depth && item.parentId === entry.parentId,
	);
	const currentIndex = siblings.findIndex((item) => item.id === entry.id);
	const previousEntry =
		currentIndex > 0 ? siblings[currentIndex - 1] : null;
	const nextEntry =
		currentIndex >= 0 && currentIndex < siblings.length - 1
			? siblings[currentIndex + 1]
			: null;

	return (
		<section className="w-full px-2 pb-6">
			<div className="mb-3 flex items-center gap-3">
				<Button
					isIconOnly
					variant="tertiary"
					onPress={handleBack}
					aria-label="返回首页"
				>
					<BiArrowBack />
				</Button>
				<h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
					分类浏览
				</h2>
			</div>

			<nav
				aria-label="面包屑导航"
				className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400"
			>
				<a href="/" className="hover:text-primary hover:underline">
					首页
				</a>
				{ancestors.map((item) => (
					<Fragment key={item.id}>
						<BiChevronRight className="size-3.5 shrink-0" aria-hidden />
						<a
							href={`${item.path}/`}
							className="hover:text-primary hover:underline"
						>
							{item.name}
						</a>
					</Fragment>
				))}
				<BiChevronRight className="size-3.5 shrink-0" aria-hidden />
				<span className="truncate text-zinc-700 dark:text-zinc-300">
					{entry.name}
				</span>
			</nav>

			<div className="space-y-4">
				<div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900">
					<div className="flex items-start gap-4">
						<div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-zinc-50 p-2 dark:border-white/12 dark:bg-zinc-800">
							{entry.icon ? (
								<IconView icon={entry.icon} size={30} className="text-2xl!" />
							) : (
								<span className="text-2xl" aria-hidden>
									🔖
								</span>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
								{entry.name}
							</h1>
							{entry.description ? (
								<p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
									{entry.description}
								</p>
							) : null}
							<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
								<span>共 {entry.siteCount} 个站点</span>
								{children.length > 0 ? (
									<span>包含 {children.length} 个子分类</span>
								) : null}
							</div>
						</div>
					</div>
				</div>

				{ownSites.length > 0 ? (
					<CategorySitesBlock
						node={entry}
						entries={entries}
						layout={layout}
						cardGrid={cardGrid}
						title={`${entry.name}精选站点`}
					/>
				) : null}

				{children.map((child) => (
					<CategorySitesBlock
						key={child.id}
						node={child}
						entries={entries}
						layout={layout}
						cardGrid={cardGrid}
					/>
				))}

				{ownSites.length === 0 && children.length === 0 ? (
					<div className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
						该分类暂未收录站点
					</div>
				) : null}

				{siblings.length > 1 ? (
					<nav
						aria-label="同类分类导航"
						className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-zinc-900"
					>
						{previousEntry ? (
							<a
								href={`${previousEntry.path}/`}
								className="inline-flex min-w-0 items-center gap-1.5 text-zinc-600 hover:text-primary dark:text-zinc-300"
							>
								<BiArrowBack className="size-4 shrink-0" aria-hidden />
								<span className="text-xs text-zinc-400 dark:text-zinc-500">
									上一个分类
								</span>
								<span className="truncate font-medium">
									{previousEntry.name}
								</span>
							</a>
						) : (
							<span />
						)}
						{nextEntry ? (
							<a
								href={`${nextEntry.path}/`}
								className="inline-flex min-w-0 items-center gap-1.5 text-zinc-600 hover:text-primary dark:text-zinc-300"
							>
								<span className="text-xs text-zinc-400 dark:text-zinc-500">
									下一个分类
								</span>
								<span className="truncate font-medium">
									{nextEntry.name}
								</span>
								<BiChevronRight className="size-4 shrink-0" aria-hidden />
							</a>
						) : null}
					</nav>
				) : null}
			</div>
		</section>
	);
}

function CategorySitesBlock({
	node,
	entries,
	layout,
	cardGrid,
	title,
}: {
	node: CategoryPageEntry;
	entries: CategoryPageEntry[];
	layout: Required<LayoutConfig>;
	cardGrid: CardGridModel;
	title?: string;
}) {
	const sites = node.category.sites ?? [];
	const children = entries.filter((item) => item.parentId === node.id);
	if (sites.length === 0 && children.length === 0) return null;

	return (
		<div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-zinc-900">
			<div className="mb-2 flex items-center gap-2 px-3">
				{node.icon ? <IconView icon={node.icon} size={18} /> : null}
				<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
					{title ?? node.name}
				</h2>
				{!title && node.description ? (
					<span className="truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
						{node.description}
					</span>
				) : null}
			</div>
			<SiteGrid sites={sites} cards={cardGrid} layout={layout} />
			{children.map((child) => (
				<div key={child.id} className="mt-5 space-y-2">
					<h3 className="flex items-center gap-1.5 px-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
						{child.icon ? <IconView icon={child.icon} size={16} /> : null}
						{child.name}
					</h3>
					<SiteGrid
						sites={child.category.sites ?? []}
						cards={cardGrid}
						layout={layout}
					/>
				</div>
			))}
		</div>
	);
}
