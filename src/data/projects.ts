export type Project = {
	title: string;
	tagline: string;
	description: string;
	stack: string[];
	github: string;
	status: string;
};

export const projects: Project[] = [
	{
		title: "Innocence",
		tagline: "一个把声音和记忆绑在一起的音乐日记 App。",
		description:
			"它不是把歌曲当成播放器里的列表，而是把歌、情绪和日常片段一起组织成可回看的个人记录。",
		stack: ["产品设计", "应用结构", "音乐体验"],
		github: "https://github.com/Zoean-z/Innocence",
		status: "音乐日记 App",
	},
	{
		title: "ResearchAgent",
		tagline: "一个有自主节奏的论文研究 Agent。",
		description:
			"模型会自己判断什么时候检索、什么时候读原文、什么时候回看长期记忆，而不是沿着固定的检索脚本机械执行。",
		stack: ["LLM Agent", "检索", "长期记忆"],
		github: "https://github.com/Zoean-z/ResearchAgent",
		status: "自主研究工作流",
	},
	{
		title: "couple-Qwen-0.8b",
		tagline: "一个面向中文对联生成的千问 0.8B 微调实验。",
		description:
			"目标是提升对联输出里的工整度、对仗关系和整体可读性，让小模型在窄任务上拿到更稳定的表现。",
		stack: ["模型微调", "中文 NLP", "效果评估"],
		github: "https://github.com/Zoean-z/couple-Qwen-0.8b",
		status: "中文生成实验",
	},
];
