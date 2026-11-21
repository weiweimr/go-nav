"use client";

import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";

/**
 * HTML 运行时模式用 URL 查询参数定位详情页。
 * 将 useSearchParams 留在独立组件中，避免 static/server 模式因读取查询参数
 * 而触发整棵前台树的客户端渲染回退（会导致静态 HTML 缺少正文）。
 */
export function AppLayoutHtml() {
	const searchParams = useSearchParams();
	return (
		<AppLayout
			deploymentMode="html"
			detailSlugOverride={searchParams.get("site")}
		/>
	);
}
