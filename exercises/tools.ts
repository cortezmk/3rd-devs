import OpenAI from "openai";
import { promises as fs } from "fs";
import axios from "axios";
import path from "path";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";

export async function mapFiles(params: {
  sourceDir: string;
  sourceFilter?: (file: string) => boolean;
  cacheFile: string;
  systemPromptFile: string;
  model?: string;
  contentProcessor?: (fileName: string, content: string) => Promise<string>;
  __dirname: string;
}): Promise<Record<string, string>> {
  let result: Record<string, string> = {};
  const openai = new OpenAI();
  const model = params.model || "gpt-4o";
  const dirname = params.__dirname;
  const contentProcessor =
    params.contentProcessor || (async (fileName, content) => content);
  const cacheFilePath = path.join(dirname, params.cacheFile);
  const sourceFilter = params.sourceFilter || (() => true);
  try {
    const data = await fs.readFile(cacheFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`${params.cacheFile} not found. Processing all files.`);
    const files = await fs.readdir(params.sourceDir);
    const system = await fs.readFile(
      path.join(dirname, params.systemPromptFile),
      "utf-8"
    );
    const pairs: { file: string; content: string }[] = await Promise.all(
      files.map(async (file) => {
        if (!sourceFilter(file)) return { file, content: "" };
        let content = await fs.readFile(
          path.join(params.sourceDir, file),
          "utf-8"
        );
        content = await contentProcessor(file, content);
        const response = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content },
          ],
        });
        const processed = response.choices[0].message.content || "";
        if (processed) return { file, content: processed };
        return { file, content: "" };
      })
    );
    pairs.forEach((pair) => {
      result[pair.file] = pair.content;
    });
    await fs.writeFile(cacheFilePath, JSON.stringify(result), "utf-8");
  }
  return result;
}

export async function prepareFile(fpath: string): Promise<string> {
  const dir = path.dirname(fpath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
  return fpath;
}

export async function performCachedCompletion<TResult>(params: {
  __dirname: string,
  model: string;
  system: string;
  question: string;
  cacheName: string;
}): Promise<TResult> {
  const {
    __dirname,
    model = "gpt-4o-mini",
    system,
    question,
    cacheName = "cache",
  } = params;
  try {
    type CacheType = { question: string; answer: TResult };
    const cacheFile = path.join(__dirname, model, `${cacheName}.json`);
    await prepareFile(cacheFile);
    let cacheStr = (await fs.exists(cacheFile))
      ? await fs.readFile(cacheFile, "utf-8")
      : "[]";
    let cache = JSON.parse(cacheStr) as CacheType[];
    let found = cache.find((a) => a.question === question);
    if (found) return found.answer;
    const openai = new OpenAI();
    let messages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content: question },
    ];
    const chatCompletion = await openai.chat.completions.create({
      messages,
      model,
      stream: false,
    });
    const completion = chatCompletion.choices[0].message.content || "";
    const answer = JSON.parse(completion) as TResult;
    cache.push({ question, answer });
    await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2), "utf-8");
    return JSON.parse(completion) as TResult;
  } catch (error) {
    console.error("Error in OpenAI completion:", error);
    throw error;
  }
}

export function removeMarkdown(text: string): string {
  let filtered = text.replaceAll("```json", "");
  filtered = filtered.replaceAll("```", "");
  return filtered;
}

export async function performCachedChatCompletion(params: {
  model: string;
  messages: ChatCompletionMessageParam[];
  cacheName: string;
  __dirname: string;
}): Promise<string> {
  const model = params.model || "gpt-4o";
  const cacheFilePath = path.join(
    params.__dirname,
    `${params.cacheName}-${model}.txt`
  );
  if (await fs.exists(cacheFilePath))
    return await fs.readFile(cacheFilePath, "utf-8");
  const openai = new OpenAI();
  console.log(JSON.stringify(params.messages));
  const response = await openai.chat.completions.create({
    model,
    messages: params.messages,
  });
  console.log(JSON.stringify(response));
  let assistantResponse = response.choices[0].message.content;
  assistantResponse = removeMarkdown(assistantResponse || "");
  await fs.writeFile(cacheFilePath, assistantResponse, "utf-8");
  return assistantResponse;
}

export async function report(taskId: string, answer: any) {
  let url = "https://centrala.ag3nts.org/report";
  let body = {
    task: taskId,
    apikey: process.env.PERSONAL_API_KEY,
    answer: answer,
  };
  console.log("Reporting:", JSON.stringify(body));
  try {
    let response = await axios.post(url, body, {
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });
    let resp = response.data;
    console.log(resp);
    return resp;
  } catch (error) {
    console.error("Error reporting:", (error as any).response.data);
    return (error as any).response.data;
  }
}

export async function getData(fileName: string): Promise<any> {
  let url = `https://centrala.ag3nts.org/data/${process.env.PERSONAL_API_KEY}/${fileName}`;
  try {
    let response = await axios.get(url, {
      headers: {
        Accept: "*/*",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });
    let resp = response.data;
    console.log(resp);
    return resp;
  } catch (error) {
    console.error("Error reporting:", (error as any).response.data);
    return (error as any).response.data;
  }
}