import siteSettings from "./data/site-settings.json";
import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

const settings = siteSettings as {
	title: string;
	subtitle: string;
	lang: SiteConfig["lang"];
	themeColor: SiteConfig["themeColor"];
	banner: SiteConfig["banner"];
	toc: SiteConfig["toc"];
	favicon: SiteConfig["favicon"];
	profile: ProfileConfig;
	license: LicenseConfig;
};

export const siteConfig: SiteConfig = {
	title: settings.title,
	subtitle: settings.subtitle,
	lang: settings.lang,
	themeColor: settings.themeColor,
	banner: settings.banner,
	toc: settings.toc,
	favicon: settings.favicon,
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		{
			name: "项目",
			url: "/projects/",
		},
		LinkPreset.Archive,
		{
			name: "算法题",
			url: "/algorithms/",
		},
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/Zoean-z",
			external: true,
		},
	],
};

export const profileConfig: ProfileConfig = settings.profile;

export const licenseConfig: LicenseConfig = settings.license;

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	theme: "github-dark",
};
