import projectsData from "./projects.json";

export type Project = {
	title: string;
	tagline: string;
	description: string;
	stack: string[];
	github: string;
	demo?: string;
	cover?: string;
	status: string;
	mark: string;
	accent: string;
};

export const projects = projectsData as Project[];
