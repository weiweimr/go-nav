import type { MouseEventHandler } from "react";
import type { LayoutConfig } from "@/types";

export interface SiteCardData {
	id?: string;
	url: string;
	intranetUrl?: string;
	title: string;
	icon?: string;
	previewImage?: string;
	description?: string;
	tags?: string[];
	bgColor?: string;
	iconPadding?: string;
}

export interface SiteCardNavigationModel {
	detailHref: string;
	href: string;
	/** 目标网址（区别于详情页地址），用于直达图标的 href 兜底。 */
	directHref: string;
	rel?: string;
	target?: string;
	useDetailPage: boolean;
	handleClick: MouseEventHandler<HTMLAnchorElement>;
	handleAuxClick: MouseEventHandler<HTMLAnchorElement>;
	handleDetailNavigate: MouseEventHandler<HTMLAnchorElement>;
	handleDirectClick: MouseEventHandler<HTMLAnchorElement>;
	handleDirectAuxClick: MouseEventHandler<HTMLAnchorElement>;
}

export interface SiteCardVisualProps {
	site: SiteCardData;
	layout?: Required<LayoutConfig>;
	navigation: SiteCardNavigationModel;
}

export interface SiteGridProps {
	sites?: SiteCardData[];
	cards: {
		minWidth: string;
		height: string;
		padding: string;
	};
	trackVisit?: boolean;
	layout?: Required<LayoutConfig>;
}
