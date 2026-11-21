import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
	resolveNavFilePathForRead,
	resolveWebsiteFilePathForRead,
} from "@/lib/server/paths";

let cachedLastModified: Date | null = null;

/**
 * 优先取数据文件最后一次提交时间。CI 部署时 checkout 会把所有文件的 mtime
 * 改成构建时间，直接用 mtime 会让 sitemap 每次发版都显示"今天更新"。
 */
function readGitLastModified(files: string[]): Date | null {
	try {
		const cwd = process.cwd();
		const relative = files
			.map((file) => path.relative(cwd, file))
			.filter((file) => file && !file.startsWith(".."));
		if (relative.length === 0) return null;

		const output = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...relative], {
			cwd,
			encoding: "utf8",
			timeout: 2000,
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (!output) return null;

		const parsed = new Date(output);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	} catch {
		return null;
	}
}

/** 数据文件的真实更新时间：git 提交时间 > 文件 mtime > 构建时间。 */
export function getDataLastModified(): Date {
	if (cachedLastModified) return cachedLastModified;

	const files = [resolveWebsiteFilePathForRead(), resolveNavFilePathForRead()];
	const gitDate = readGitLastModified(files);

	let fileDate: Date | null = null;
	for (const file of files) {
		try {
			const mtime = fs.statSync(file).mtime;
			if (!fileDate || mtime.getTime() > fileDate.getTime()) fileDate = mtime;
		} catch {
			// 文件不存在时忽略，交给下一个来源。
		}
	}

	cachedLastModified = gitDate ?? fileDate ?? new Date();
	return cachedLastModified;
}
