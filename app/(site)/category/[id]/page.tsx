import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
	collectCategoryPageEntries,
	findCategoryPageEntryBySlug,
} from "@/lib/category-pages";
import { flattenSites, getNav, getWebsiteData } from "@/lib/config";
import { buildCategoryJsonLd, buildCategoryMetadata } from "@/lib/seo";
import { readSiteAccessStatus } from "@/lib/server/site-access-request";

interface CategoryRouteProps {
	params: Promise<{ id: string }>;
}

const STATIC_PLACEHOLDER_SLUG = "__placeholder__";
const isHtmlDeployment =
	(process.env.BUILD_MODE || "server").toLowerCase() === "html";
const isServerDeployment =
	(process.env.BUILD_MODE || "server").toLowerCase() === "server";

export function generateStaticParams() {
	if (isHtmlDeployment) return [{ id: STATIC_PLACEHOLDER_SLUG }];

	const entries = collectCategoryPageEntries(getWebsiteData().categories);
	if (entries.length === 0) return [{ id: STATIC_PLACEHOLDER_SLUG }];
	return entries.map((entry) => ({ id: entry.slug }));
}

export async function generateMetadata({
	params,
}: CategoryRouteProps): Promise<Metadata> {
	const { id } = await params;
	const noIndex: Metadata = { robots: { index: false, follow: false } };

	if (isHtmlDeployment || id === STATIC_PLACEHOLDER_SLUG) return noIndex;
	if (isServerDeployment && !(await readSiteAccessStatus()).allowed) {
		return noIndex;
	}

	const entries = collectCategoryPageEntries(getWebsiteData().categories);
	const matched = findCategoryPageEntryBySlug(entries, id);
	if (!matched) return noIndex;

	return buildCategoryMetadata(getNav(), matched);
}

export default async function CategoryRoute(props: CategoryRouteProps) {
	const { id } = await props.params;
	if (isHtmlDeployment) notFound();
	if (isServerDeployment && !(await readSiteAccessStatus()).allowed) {
		return null;
	}

	const entries = collectCategoryPageEntries(getWebsiteData().categories);
	const matched = findCategoryPageEntryBySlug(entries, id);
	if (!matched || id === STATIC_PLACEHOLDER_SLUG) notFound();

	const jsonLd = buildCategoryJsonLd(
		getNav(),
		matched,
		entries,
		flattenSites([matched.category]),
	);
	if (!jsonLd) return null;

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: jsonLd }}
		/>
	);
}
