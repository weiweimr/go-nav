import { getNav, getWebsiteData } from "@/lib/config";
import { buildHomeJsonLd } from "@/lib/seo";

/** 首页主要视觉内容由 (site)/layout 中的 SiteShell 输出。 */
export default function HomePage() {
	const nav = getNav();
	const websiteData = getWebsiteData();
	const jsonLd = buildHomeJsonLd(nav, websiteData.categories);
	const description = nav.description?.trim();

	return (
		<>
			<section className="sr-only" aria-labelledby="home-title">
				<h1 id="home-title">{nav.name?.trim() || "Go Nav"}</h1>
				{description ? <p>{description}</p> : null}
			</section>
			{jsonLd ? (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: jsonLd }}
				/>
			) : null}
		</>
	);
}
