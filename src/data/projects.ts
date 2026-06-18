export type Project = {
	title: string;
	tagline: string;
	description: string;
	stack: string[];
	github: string;
	status: string;
	accent: string;
};

export const projects: Project[] = [
	{
		title: "Innocence",
		tagline: "A music diary app for keeping sound tied to memory.",
		description:
			"A personal journaling app shaped around songs, moods, and fragments of daily life instead of plain text entries alone.",
		stack: ["Product Design", "App Architecture", "Music UX"],
		github: "https://github.com/Zoean-z/Innocence",
		status: "Music diary app",
		accent:
			"from-[oklch(0.83_0.09_205)] via-[oklch(0.89_0.03_205)] to-transparent",
	},
	{
		title: "ResearchAgent",
		tagline: "An autonomous paper research agent with its own retrieval rhythm.",
		description:
			"The model decides when to search, when to open the original paper, and when to consult long-term memory instead of following a rigid retrieval script.",
		stack: ["LLM Agents", "Retrieval", "Persistent Memory"],
		github: "https://github.com/Zoean-z/ResearchAgent",
		status: "Autonomous research workflow",
		accent:
			"from-[oklch(0.77_0.11_225)] via-[oklch(0.89_0.03_205)] to-transparent",
	},
	{
		title: "couple-Qwen-0.8b",
		tagline: "A fine-tuned Qwen 0.8B model for stronger Chinese couplet generation.",
		description:
			"A focused model adaptation project aimed at improving poetic structure, parallelism, and output quality in couplet generation.",
		stack: ["Fine-tuning", "Chinese NLP", "Evaluation"],
		github: "https://github.com/Zoean-z/couple-Qwen-0.8b",
		status: "Model adaptation",
		accent:
			"from-[oklch(0.8_0.1_190)] via-[oklch(0.89_0.03_205)] to-transparent",
	},
];
