import path from "path";
import { prepareFile, report } from "../tools";
import { promises as fs } from "fs";
import { OpenAIService } from "./OpenAIService";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions.mjs";

const model = "gpt-4o-mini";
const baseImgUrl = "https://centrala.ag3nts.org/dane/barbara/";
const cacheFilePath = await prepareFile(
  path.join(__dirname, model, "cache.json")
);
const openai = new OpenAIService();
const systemDescribe = await fs.readFile(
  path.join(__dirname, "prompts", "describe.txt"),
  "utf-8"
);
const systemCombine = await fs.readFile(
  path.join(__dirname, "prompts", "combine.txt"),
  "utf-8"
);
const finalDescriptionFile = await prepareFile(
  path.join(__dirname, model, "finalDescription.json")
);
let resultDescription: string[] = [];
const goodImages: string[] = [];

function imageUrl(name: string): string {
  return `${baseImgUrl}${name}`;
}

async function loadQueryCache(): Promise<Query[]> {
  if (await fs.exists(cacheFilePath)) {
    const content = await fs.readFile(cacheFilePath, "utf-8");
    return JSON.parse(content);
  }
  return [];
}
async function saveQueryCache(): Promise<void> {
  await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2), "utf-8");
}

type Description = {
  step1: string;
  step2: string;
  action?: string;
  answer?: string;
};

type FinalDescription = {
  photos: string[];
  hints: string[];
  description: string;
};

type Query = {
  request: string;
  response: string;
};
let cache: Query[] = await loadQueryCache();

function getImages(text: string): string[] {
  const fileNameRegex = /\b\w+\.\bPNG\b/g;
  const matches = text.match(fileNameRegex);
  return matches ? matches : [];
}

async function ask(text: string): Promise<string> {
  const query = text.trim();
  const cachedQuery = cache.find((q) => q.request === query);
  if (cachedQuery) return cachedQuery.response;
  const resp = await report("photos", query);
  const r = (resp as any).message.toString();
  cache.push({ request: query, response: r });
  saveQueryCache();
  return r;
}

async function start(): Promise<string[]> {
  const response = await ask("START");
  const images = getImages(response);
  return images;
}

async function downloadImage(imageName: string): Promise<void> {
  const imgUrl = imageUrl(imageName);
  let imgPath = path.join(__dirname, model, "cache", imageName);
  imgPath = await prepareFile(imgPath);
  if (await fs.exists(imgPath)) return;
  const resp = await fetch(imgUrl);
  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(imgPath, buffer);
}

async function describeImage(imageName: string): Promise<Description> {
  const imgUrl = imageUrl(imageName);
  await downloadImage(imageName);
  let descrPath = path.join(__dirname, model, "cache", `${imageName}.txt`);
  descrPath = await prepareFile(descrPath);
  if (await fs.exists(descrPath))
    return JSON.parse(await fs.readFile(descrPath, "utf-8")) as Description;
  const response = await openai.completion({
    model,
    messages: [
      { role: "system", content: systemDescribe },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imgUrl,
            },
          },
        ],
      },
    ],
  });
  const descrStr =
    (response as ChatCompletion)?.choices[0].message.content || "";
  console.log(`Got description: ${descrStr}`);
  const descr = JSON.parse(descrStr) as Description;
  if (!descr) throw new Error(`Invalid description: ${descrStr}`);
  await fs.writeFile(descrPath, JSON.stringify(descr, null, 2), "utf-8");
  return descr;
}

function GetSimilarFinalDescription(
  photos: string[],
  hints: string[],
  finalDescriptions: FinalDescription[]
): FinalDescription | null {
  let fd = finalDescriptions.filter(
    (fd) =>
      JSON.stringify(fd.photos.sort()) === JSON.stringify(photos.sort()) &&
      JSON.stringify(fd.hints.sort()) === JSON.stringify(hints.sort())
  );
  return fd && fd.length > 0 ? fd[0] : null;
}

async function createFinalDescription(
  photos: string[],
  hints: string[]
): Promise<string> {
  let finalDescriptions: FinalDescription[] = [];
  if (await fs.exists(finalDescriptionFile))
    finalDescriptions = JSON.parse(
      await fs.readFile(finalDescriptionFile, "utf-8")
    );
  let fd = GetSimilarFinalDescription(photos, hints, finalDescriptions);
  if (fd) return fd.description;
  let messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemCombine },
  ];
  let userContent: any[] = [
    { type: "text", text: `The hints are:\n${hints.join("\n")}` },
  ];
  photos
    .map((photo) => ({
      type: "image_url",
      image_url: {
        url: imageUrl(photo),
      },
    }))
    .forEach((image) => userContent.push(image));
  messages.push({ role: "user", content: userContent });
  const response = await openai.completion({ model, messages });
  const combined =
    (response as ChatCompletion)?.choices[0].message.content || "";
  finalDescriptions.push({ photos, hints, description: combined });
  await fs.writeFile(
    finalDescriptionFile,
    JSON.stringify(finalDescriptions, null, 2),
    "utf-8"
  );
  return combined;
}

async function processImage(imageName: string): Promise<void> {
  console.log(`Processing image: ${imageName}`);
  const description = await describeImage(imageName);
  if (description.answer) {
    console.log(`Got description: ${description.answer}`);
    resultDescription.push(description.answer);
    goodImages.push(imageName);
    return;
  }
  if (description.action) {
    console.log(`action: ${description.action}`);
    const response = await ask(`${description.action} ${imageName}`);
    console.log(`response: ${response}`);
    let images = getImages(response);
    for (let img of images) {
      allImages.push(img);
    }
  }
}

let allImages = await start();
debugger;
for (let i = 0; i < Math.min(allImages.length, 10); i++) {
  await processImage(allImages[i]);
}
let hints: string[] = [];
for (let i = 0; i < 3; i++) {
  let finalDescription = await createFinalDescription(goodImages, hints);
  const result = await report("photos", finalDescription);
  let resultHints = result?.hints as string[];
  if (resultHints) hints.push(...resultHints);
  else break;
}
