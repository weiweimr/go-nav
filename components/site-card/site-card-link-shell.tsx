"use client";

import Link, { useLinkStatus } from "next/link";
import type { PropsWithChildren } from "react";
import { BiLinkExternal } from "react-icons/bi";
import { PageNavigationLinkActivity } from "@/components/page-navigation";
import { FOCUS_RING_CLASS } from "@/components/ui/ui.constants";
import type { SiteCardNavigationModel } from "./site-card.types";

function DetailNavigationProgress() {
	const { pending } = useLinkStatus();
	return pending ? <PageNavigationLinkActivity /> : null;
}

const DIRECT_BUTTON_CLASS =
	`absolute top-2 right-2 z-10 grid size-7 place-items-center rounded-lg border border-black/8 bg-white/90 text-zinc-500 shadow-sm backdrop-blur-sm opacity-0 transition-[opacity,color,background-color,border-color] duration-200 ease-out
	hover:border-primary/30 hover:bg-primary hover:text-white
	dark:border-white/12 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:border-primary/40 dark:hover:bg-primary dark:hover:text-white
	[@media(hover:hover)]:group-hover:opacity-100
	focus-visible:opacity-100 ${FOCUS_RING_CLASS}`;

export function SiteCardLinkShell({
	ariaLabel,
	className,
	navigation,
	children,
}: PropsWithChildren<{
	ariaLabel: string;
	className: string;
	navigation: SiteCardNavigationModel;
}>) {
	if (navigation.useDetailPage) {
		return (
			<div className="group relative h-full">
				<Link
					href={navigation.detailHref}
					scroll
					onClick={navigation.handleDetailNavigate}
					aria-label={ariaLabel}
					className={className}
				>
					{children}
					<DetailNavigationProgress />
				</Link>
				<a
					href={navigation.directHref}
					target={navigation.target}
					rel={navigation.rel}
					aria-label={`直达 ${ariaLabel}`}
					title={`直达 ${ariaLabel}`}
					onClick={navigation.handleDirectClick}
					onAuxClick={navigation.handleDirectAuxClick}
					className={DIRECT_BUTTON_CLASS}
				>
					<BiLinkExternal className="size-3.5" aria-hidden />
				</a>
			</div>
		);
	}

	return (
		<a
			href={navigation.href}
			target={navigation.target}
			rel={navigation.rel}
			aria-label={ariaLabel}
			onClick={navigation.handleClick}
			onAuxClick={navigation.handleAuxClick}
			className={className}
		>
			{children}
		</a>
	);
}
