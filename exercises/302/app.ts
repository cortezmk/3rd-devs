import { OpenAIService } from "./OpenAIService";
import { TextSplitter } from "./TextService";
import { VectorService } from "./VectorService";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { mapFiles, report } from "../tools";
import path from "path";
import { promises as fs } from "fs";

const weaponFilesPath = `${__dirname}\\..\\..\\..\\pliki\\weapons_tests\\do-not-share`;

const openai = new OpenAIService();
const vectorService = new VectorService(openai);
const textSplitter = new TextSplitter();

const collectionName = "wektory";
async function initializeData() {
  const weaponKeywords = await mapFiles({
    sourceDir: weaponFilesPath,
    cacheFile: "weaponsKeywords.json",
    systemPromptFile: "weaponsKeywordsSystem.txt",
    __dirname,
  });
  const weaponArray = Object.entries(weaponKeywords).map(([name, keywords]) => ({
    name,
    keywords,
  }));
  const points = await Promise.all(
    weaponArray.map(async ({ name, keywords }) => {
      let date = path.basename(name).replaceAll("_", "-");
      date = path.parse(date).name;
      const content = await fs.readFile(
        path.join(weaponFilesPath, name),
        "utf-8"
      );
      const doc = await textSplitter.document(keywords, "gpt-4o", {
        date,
        content,
        keywords
      });
      return doc;
    })
  );
  await vectorService.initializeCollectionWithData(collectionName, points);
}

await initializeData();
const query = 'kradzież kradzież prototyp broń';
const searchResults = await vectorService.performSearch(collectionName, query);

console.log(searchResults);
console.log(searchResults[0].payload?.keywords);

report('wektory', searchResults[0].payload?.date || 'unknown');
