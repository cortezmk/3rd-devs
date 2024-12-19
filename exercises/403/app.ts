import TurndownService from "turndown";
import { promises as fs } from "fs";
import path from "path";
import axios from "axios";
import { OpenAIService } from "./OpenAIService";
import { prepareFile, report } from "../tools";
import findAnswerPrompt from "./prompts/findAnswerPrompt";
import rankSubUrlPrompt from "./prompts/rankSubUrlPrompt";
import type { ChatCompletion } from "openai/resources/chat/completions.mjs";

const baseUrl = "https://softo.ag3nts.org";

type Questions = Record<string, string>;

type Answer = {
  question: string;
  url: string;
  answer: ModelAnswer;
};

type ModelAnswer = {
  thinking: string;
  answer: string | null;
  isOk: boolean;
};

type LinkRanking = {
  thinking: string;
  rank: number;
};

type LinkCandidate = {
  url: string;
  thinking: string;
  rank: number;
};

type LinkCandidateCache = {
  question: string;
  url: string;
  candidates: LinkCandidate[];
};

const turndownService = new TurndownService();
const openaiService = new OpenAIService();
const model = "gpt-4o-mini";
const cacheFilePath = await prepareFile(
  path.join(__dirname, model, "cache.json")
);
const linkRankingFilePath = await prepareFile(
  path.join(__dirname, model, "linkRanking.json")
);

async function loadAnswers(filePath: string): Promise<Answer[]> {
  if (await fs.exists(filePath)) {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  }
  return [];
}
const answers: Answer[] = await loadAnswers(cacheFilePath);

async function loadLinkRankingCache(
  filePath: string
): Promise<LinkCandidateCache[]> {
  if (await fs.exists(filePath)) {
    const content = await fs.readFile(linkRankingFilePath, "utf-8");
    return JSON.parse(content);
  }
  return [];
}
const linkRankingCache: LinkCandidateCache[] = await loadLinkRankingCache(
  linkRankingFilePath
);

async function fetchQuestions(): Promise<Questions> {
  const url = `https://centrala.ag3nts.org/data/${process.env.PERSONAL_API_KEY}/softo.json`;
  let resp = await axios.get(url);
  return resp.data as Questions;
}

async function scrapSubUrl(subUrl: string): Promise<string> {
  const mdFile = path.join(
    __dirname,
    "scraps",
    `${subUrl.replace(/\//g, "-")}.md`
  );
  if (await fs.exists(mdFile)) return await fs.readFile(mdFile, "utf-8");
  let url = subUrl.includes('https://') ? subUrl : `${baseUrl}${subUrl}`;
  console.log(`Scraping ${url}`);
  let resp = await fetch(url);
  let html = await resp.text();
  let md = turndownService.turndown(html);
  fs.writeFile(mdFile, md, "utf-8");
  return md;
}

function getLinksFromMd(md: string): string[] {
  const links = md.match(/\[.*?\]\(.*?\)/g) || [];
  return links;
}

async function getLinkRanks(
  links: string[],
  subUrl: string,
  question: string,
  maxLinks = 10
): Promise<LinkCandidate[]> {
  if (
    linkRankingCache.find((c) => c.question === question && c.url === subUrl)
  ) {
    return (
      linkRankingCache.find((c) => c.question === question && c.url === subUrl)
        ?.candidates || []
    );
  }
  let ranks: LinkCandidate[] = await Promise.all(
    links.slice(0, maxLinks).map(async (link) => {
      const response = await openaiService.completion({
        model,
        messages: [
          { role: "system", content: rankSubUrlPrompt() },
          { role: "user", content: `${question}\n${link}` },
        ],
      });
      const resp =
        (response as ChatCompletion).choices[0].message.content || "";
      let lr = JSON.parse(resp) as LinkRanking;
      return { url: link, ...lr };
    })
  );
  ranks = ranks.sort((a, b) => b.rank - a.rank);
  linkRankingCache.push({ question, url: subUrl, candidates: ranks });
  await fs.writeFile(
    linkRankingFilePath,
    JSON.stringify(linkRankingCache, null, 2),
    "utf-8"
  );
  return ranks;
}

async function tryFindAnswerTo(
  question: string,
  subUrl: string,
  md: string,
  prompt: (q: string) => string,
  cacheFile: string,
  cache: Answer[]
): Promise<ModelAnswer> {
  let answer = cache.find((a) => a.question === question && a.url === subUrl);
  if (answer) return answer.answer;
  const response = await openaiService.completion({
    model,
    messages: [
      { role: "system", content: prompt(question) },
      { role: "user", content: md },
    ],
  });
  const resp = (response as ChatCompletion).choices[0].message.content || "";
  let ma = JSON.parse(resp) as ModelAnswer;
  answers.push({ question, url: subUrl, answer: ma });
  await fs.writeFile(cacheFile, JSON.stringify(answers, null, 2), "utf-8");
  return ma;
}

function getUrlFromMarkdownLink(link: string): string {
  return (
    link
      .match(/\(.*?\)/)?.[0]
      .slice(1, -1)
      ?.split(" ")[0] || ""
  );
}

async function findAnswerToQuestion(
  question: string,
  subUrl: string,
  depth: number
): Promise<string | null> {
  if (depth === 0) return null;
  const md = await scrapSubUrl(subUrl);
  let answer = await tryFindAnswerTo(
    question,
    subUrl,
    md,
    findAnswerPrompt,
    cacheFilePath,
    answers
  );
  if (answer.isOk) return answer.answer || null;
  const links = getLinksFromMd(md);
  if (links.length === 0) return null;
  const ranks = await getLinkRanks(links, subUrl, question);
  for (let i = 0; i < 3 && i < ranks.length; i++) {
    const rank = ranks[i];
    const subUrl = getUrlFromMarkdownLink(rank.url);
    console.log(`Trying ${subUrl}`);
    let answer = await findAnswerToQuestion(question, subUrl, depth - 1);
    if (answer) return answer;
  }
  return null;
}

const resolution: Questions = {};
const questions = await fetchQuestions();
for (const [questionId, question] of Object.entries(questions)) {
  let answer = await findAnswerToQuestion(question, "", 3);
  console.log(`Question: ${question} Answer: ${answer}`);
  resolution[questionId] = answer || "";
}
await report('softo', resolution);
