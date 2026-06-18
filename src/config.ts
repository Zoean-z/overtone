import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "overtone.zoean",
	subtitle: "你听见的，不止于此。",
	lang: "zh_CN",
	themeColor: {
		hue: 205,
		fixed: false,
	},
	banner: {
		enable: true,
		src: "/brand/banner.png",
		position: "center",
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
	toc: {
		enable: true,
		depth: 2,
	},
	favicon: [
		{
			src: "/brand/overtone-favicon.svg",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		{
			name: "项目",
			url: "/projects/",
		},
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/Zoean-z",
			external: true,
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/brand/avatar.png",
	name: "Zoean",
	bio: "在音乐、研究工作流和有表达力的软件之间寻找更深一层的结构。",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Zoean-z",
		},
		{
			name: "Innocence",
			icon: "fa6-solid:music",
			url: "https://github.com/Zoean-z/Innocence",
		},
		{
			name: "ResearchAgent",
			icon: "fa6-solid:book-open-reader",
			url: "https://github.com/Zoean-z/ResearchAgent",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	theme: "github-dark",
};
