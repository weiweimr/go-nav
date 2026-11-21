import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getNav, getWebsiteData } from "@/lib/config";
import { buildDetailJsonLd, buildDetailMetadata } from "@/lib/seo";
import {
	collectSiteDetailEntries,
	findSiteDetailEntryBySlug,
} from "@/lib/site-detail";
import { readSiteAccessStatus } from "@/lib/server/site-access-request";

interface SiteDetailRouteProps {
	params: Promise<{ slug: string }>;
}

const STATIC_PLACEHOLDER_SLUG = "__placeholder__";
const isHtmlDeployment =
	(process.env.BUILD_MODE || "server").toLowerCase() === "html";
const isServerDeployment =
	(process.env.BUILD_MODE || "server").toLowerCase() === "server";

export function generateStaticParams() {
	if (isHtmlDeployment) {
		return [{ slug: STATIC_PLACEHOLDER_SLUG }];
	}

	const nav = getNav();
	const websiteData = getWebsiteData();
	const entries = collectSiteDetailEntries(websiteData.categories);

	// Next.js static export requires at least one prerendered param for dynamic routes.
	// When detail pages are disabled or there is no site data, keep a placeholder route.
	if (nav.layout?.enableSiteDetailPage !== true || entries.length === 0) {
		return [{ slug: STATIC_PLACEHOLDER_SLUG }];
	}

	return entries.map((item) => ({
		slug: item.slug,
	}));
}

export async function generateMetadata({
	params,
}: SiteDetailRouteProps): Promise<Metadata> {
	const { slug } = await params;
	const noIndex: Metadata = { robots: { index: false, follow: false } };

	if (isHtmlDeployment || slug === STATIC_PLACEHOLDER_SLUG) return noIndex;
	if (isServerDeployment && !(await readSiteAccessStatus()).allowed) {
		return noIndex;
	}

	const nav = getNav();
	if (nav.layout?.enableSiteDetailPage !== true) return noIndex;

	const entries = collectSiteDetailEntries(getWebsiteData().categories);
	const matched = findSiteDetailEntryBySlug(entries, slug);
	if (!matched) return noIndex;

	return buildDetailMetadata(nav, matched);
}

export default async function SiteDetailRoute(props: SiteDetailRouteProps) {
	const { slug } = await props.params;
	if (isHtmlDeployment) {
		notFound();
	}
	if (isServerDeployment && !(await readSiteAccessStatus()).allowed) {
		return null;
	}

	const nav = getNav();
	const detailEnabled = nav.layout?.enableSiteDetailPage === true;
	if (!detailEnabled || slug === STATIC_PLACEHOLDER_SLUG) {
		notFound();
	}

	const websiteData = getWebsiteData();
	const entries = collectSiteDetailEntries(websiteData.categories);
	const matched = findSiteDetailEntryBySlug(entries, slug);
	if (!matched) notFound();
	if (matched.slug !== slug) {
		redirect(matched.path);
	}

	const jsonLd = buildDetailJsonLd(nav, matched);
	if (!jsonLd) return null;

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: jsonLd }}
		/>
	);
}
