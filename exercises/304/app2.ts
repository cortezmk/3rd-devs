import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { promises as fs } from "fs";
import path from "path";
import axios from "axios";
import { report } from "../tools";

const openai = new OpenAI();
const model = "gpt-4o";
const messagesFileName = `messages-${model}.json`;
const system = await fs.readFile(path.join(__dirname, "system.txt"), "utf-8");
const question = await fs.readFile(path.join(__dirname, "user.txt"), "utf-8");

async function prepareMessages(): Promise<ChatCompletionMessageParam[]> {
  const messagesFile = path.join(__dirname, messagesFileName);
  let messages: ChatCompletionMessageParam[] = [];
  if (!(await fs.exists(messagesFile))) {
    return [
      { role: "system", content: system },
      { role: "user", content: question },
    ];
  }
  const messagesContent = await fs.readFile(messagesFile, "utf-8");
  messages = JSON.parse(messagesContent);
  return messages;
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
  let response = await axios.post(url, body, {
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Accept-Encoding": "gzip, deflate, br",
    },
  });
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

async function performQuery(messages: ChatCompletionMessageParam[]) {
  const response = await openai.chat.completions.create({
    model,
    messages,
  });
  let assistantResponse = response.choices[0].message.content;
  assistantResponse = removeMarkdown(assistantResponse || "");
  messages.push({ role: "assistant", content: assistantResponse });
  await fs.writeFile(
    path.join(__dirname, messagesFileName),
    JSON.stringify(messages),
    "utf-8"
  );
  return assistantResponse;
}

function removeMarkdown(text: string): string {
  let split = text.split("\r\n");
  split = split.filter((line) => !line.startsWith("```"));
  return split.join("\r\n");
}

//let result = await processDatabaseQueries({"people": ["Aleksander"], "places": ["KRAKOW", "LUBLIN"] });
//let result = await queryDatabase("people", "Aleksander");
//console.log(result);

const messages = await prepareMessages();
let answer: (number | string)[] = [];
for (let i = 0; i < 10; i++) {
  let response = await performQuery(messages);
  if (!response) break;
  console.log(`AI: ${response}`);
  let jsonResponse = JSON.parse(response);
  if (jsonResponse.answer && jsonResponse.answer !== '') {
    answer = jsonResponse.answer.toString();
    if (answer.length !== 0) {
      console.log(`DB: ${answer}`);
      break;
    }
  }
  let query: Record<string, string[]> = {};
  if('people' in jsonResponse) {
    query.people = jsonResponse.people;
  }
  if('places' in jsonResponse) {
    query.places = jsonResponse.places;
  }
  let dbResponse = await processDatabaseQueries(query);
  response = JSON.stringify(dbResponse);
  console.log(`DB: ${response}`);
  if (!response) break;
  messages.push({ role: "user", content: response });
}
//report("loop", answer);
