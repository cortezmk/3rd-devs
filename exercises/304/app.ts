import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { cp, promises as fs } from "fs";
import path from "path";
import axios from "axios";
import { report, performCachedChatCompletion, removeMarkdown } from "../tools";

const openai = new OpenAI();
const model = "gpt-4o";
const messagesFileName = `messages-${model}.json`;
const system = await fs.readFile(path.join(__dirname, "system.txt"), "utf-8");
const user1question = await fs.readFile(path.join(__dirname, "user1.txt"), "utf-8");

type InfoList = {
  people: string[];
  places: string[];
}

type AList = Record<string, string[]>;

async function getInitialInfoList(): Promise<InfoList> {
  const response = await performCachedChatCompletion({
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: user1question },
    ],
    cacheName: "assistant1",
    __dirname
  });
  if (!response) {
    return { people: [], places: [] };
  }
  return JSON.parse(response);
}

function removePolishCharacters(text: string): string {
  const polishCharacters = "ąćęłńóśźż".toUpperCase();
  const englishCharacters = "acelnoszz".toUpperCase();
  for (let i = 0; i < polishCharacters.length; i++) {
    text = text.replaceAll(polishCharacters[i], englishCharacters[i]);
  }
  return text;
}

async function queryDatabase(name: string, query: string): Promise<string[]> {
  query = removePolishCharacters(query.toUpperCase());
  console.log(`Querying database for ${name} with query: ${query}`);
  let url = `https://centrala.ag3nts.org/${name}`;
  let body = {
    apikey: process.env.PERSONAL_API_KEY,
    query
  };
  let response: any = null;
  try {
    response = await axios.post(url, body, {
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });
  } catch (error) {
    console.error("Error querying database:", (error as any).response.data.message);
  }
  if (!response)
    return [];
  let message = response.data.message.replaceAll("[**RESTRICTED DATA**]", "**RESTRICTED_DATA**")
  let split = message.split(" ");
  return split;
}

async function processDatabaseQueries(
  input: Record<string, string[]>
): Promise<Record<string, Record<string, string[]>>> {
  let output: Record<string, Record<string, string[]>> = {};
  for (let key in input) {
    output[key] = {};
    let value = input[key];
    await Promise.all(value.map(async v => {
      let result = await queryDatabase(key, v);
      output[key][v] = result;
    }));
  }
  return output;
}

function distributeSearchResults(alreadySearched: AList, searchResult: Record<string, AList>): InfoList {
  let toSearch: AList = {};
  for(let typ in searchResult) {
    for(let key in searchResult[typ]) {
      let value = searchResult[typ][key];
      for(let v of value) {
        if(v === "BARBARA") {
          whereBarbaraWas.push(key);
          console.log(`!!!!Barbara was in ${key}!`);
        }
        if(alreadySearched[typ] && alreadySearched[typ].includes(v))
          continue;
        if(v === "**RESTRICTED_DATA**")
          continue;
        alreadySearched[typ] = alreadySearched[typ] || [];
        alreadySearched[typ].push(v);
        // if(v.includes("/"))
        //   continue;
        toSearch[typ] = toSearch[typ] || [];
        toSearch[typ].push(v);
      }
    }
  }
  return {
    places: toSearch.people || [],
    people: toSearch.places || []
  }
}

let toBeSearched: InfoList = await getInitialInfoList();
let alreadySearched: InfoList = { people: [], places: [] };
let whereBarbaraWas: string[] = [];
for(let i = 0; i < 20; i++) {
  let searchResult = await processDatabaseQueries(toBeSearched);
  console.log(`searchResult: ${JSON.stringify(searchResult)}`);
  toBeSearched = distributeSearchResults(alreadySearched, searchResult);
  console.log(`toBeSearched: ${JSON.stringify(toBeSearched)}`);
  if(toBeSearched.people.length === 0 && toBeSearched.places.length === 0) {
    break;
  }
}
console.log(`whereBarbaraWas: ${JSON.stringify(whereBarbaraWas)}`);
for(let place of whereBarbaraWas) {
  report("loop", place);
}
//report("loop", answer);
