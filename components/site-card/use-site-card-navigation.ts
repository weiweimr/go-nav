"use client";

import { useCallback, useMemo, type MouseEvent } from "react";
import { useStore } from "jotai";
import { activeIdAtom, selectedSubcategoryIdsAtom } from "@/lib/store/site";
import type { LayoutConfig, NavSite } from "@/types";
import { recordVisit } from "@/hooks/use-recent-visits";
import {
	getPreferredSiteHref,
	openSiteWithPreference,
	type SiteLinkMode,
} from "@/lib/client/site-link";
import {
	getCurrentPageRouteKey,
	saveHomeSnapshot,
	savePageSnapshot,
} from "@/lib/client/home-restore";
import { buildSiteDetailPath, buildSiteDetailSlug } from "@/lib/site-detail";
import type { SiteCardData, SiteCardNavigationModel } from "./site-card.types";

export function useSiteCardNavigation({
	site,
	trackVisit,
	layout,
	siteLinkMode,
}: {
	site: SiteCardData;
	trackVisit: boolean;
	layout?: Required<LayoutConfig>;
	siteLinkMode: SiteLinkMode;
}): SiteCardNavigationModel {
	const store = useStore();
	const detailHref = useMemo(() => buildSiteDetailPath(site), [site]);
	const useDetailPage = layout?.enableSiteDetailPage === true;
	const target = layout?.linkTarget === "current" ? undefined : "_blank";
	const rel = target ? "noopener noreferrer" : undefined;
	const preferredHref = useMemo(
		() =>
			getPreferredSiteHref(
				site,
				{
					autoUseIntranet: layout?.autoUseIntranet,
				},
				siteLinkMode,
			),
		[layout?.autoUseIntranet, site, siteLinkMode],
	);
	const href = useDetailPage ? detailHref : preferredHref;
	/** 目标网址本身，供「直达」图标在无 JS / 中键 / 新标签场景兜底。 */
	const directHref = preferredHref;

	const openDirect = useCallback(
		(event: MouseEvent<HTMLAnchorElement>) => {
			const isModifiedClick =
				event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

			if (isModifiedClick) {
				if (trackVisit) recordVisit(site as NavSite);
				return;
			}

			event.preventDefault();
			if (trackVisit) {
				recordVisit(site as NavSite);
			}
			void openSiteWithPreference(site, {
				linkTarget: layout?.linkTarget,
				autoUseIntranet: layout?.autoUseIntranet,
			});
		},
		[layout?.autoUseIntranet, layout?.linkTarget, site, trackVisit],
	);

	const handleClick = useCallback(
		(event: MouseEvent<HTMLAnchorElement>) => {
			if (useDetailPage) return;
			openDirect(event);
		},
		[openDirect, useDetailPage],
	);

	/** 详情页卡片上的「直达」图标：无论是否启用详情页，都直接打开目标网址。 */
	const handleDirectClick = useCallback(
		(event: MouseEvent<HTMLAnchorElement>) => {
			event.stopPropagation();
			openDirect(event);
		},
		[openDirect],
	);

	const handleAuxClick = useCallback(
		(event: MouseEvent<HTMLAnchorElement>) => {
			if (useDetailPage) return;
			if (event.button !== 1) return;

			event.preventDefault();
			if (trackVisit) {
				recordVisit(site as NavSite);
			}
			void openSiteWithPreference(
				site,
				{
					linkTarget: layout?.linkTarget,
					autoUseIntranet: layout?.autoUseIntranet,
				},
				{ forceNewTab: true },
			);
		},
		[
			layout?.autoUseIntranet,
			layout?.linkTarget,
			site,
			trackVisit,
			useDetailPage,
		],
	);

	const handleDirectAuxClick = useCallback(
		(event: MouseEvent<HTMLAnchorElement>) => {
			event.stopPropagation();
			if (event.button !== 1) return;

			event.preventDefault();
			if (trackVisit) {
				recordVisit(site as NavSite);
			}
			void openSiteWithPreference(
				site,
				{
					linkTarget: layout?.linkTarget,
					autoUseIntranet: layout?.autoUseIntranet,
				},
				{ forceNewTab: true },
			);
		},
		[layout?.autoUseIntranet, layout?.linkTarget, site, trackVisit],
	);

	const handleDetailNavigate = useCallback(
		(event: MouseEvent<HTMLAnchorElement>) => {
			if (!useDetailPage) return;
			if (event.defaultPrevented) return;
			if (event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

			const snapshot = {
				scrollY: window.scrollY,
				activeId: store.get(activeIdAtom),
				selectedSubcategoryIds: store.get(selectedSubcategoryIdsAtom),
				detailSlug: buildSiteDetailSlug(site),
			};
			saveHomeSnapshot(snapshot);
			savePageSnapshot(getCurrentPageRouteKey(), snapshot);
		},
		[site, store, useDetailPage],
	);

	return {
		detailHref,
		handleAuxClick,
		handleClick,
		handleDetailNavigate,
		handleDirectAuxClick,
		handleDirectClick,
		directHref,
		href,
		rel,
		target,
		useDetailPage,
	};
}
