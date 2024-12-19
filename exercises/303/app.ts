import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { promises as fs } from "fs";
import path from "path";
import axios from "axios";
import { report } from "../tools";

const openai = new OpenAI();
const model = "gpt-4o-mini";
const system = await fs.readFile(path.join(__dirname, "system.txt"), "utf-8");
const question =
  "które aktywne datacenter (DC_ID) są zarządzane przez pracowników, którzy są na urlopie (is_active=0)? Odpowiedź powinna być array z wartościami np. [1, 2, 3]";

async function prepareMessages(): Promise<ChatCompletionMessageParam[]> {
  const messagesFile = path.join(__dirname, "messages.json");
  let messages: ChatCompletionMessageParam[] = [];
  if (!(await fs.exists(messagesFile))) {
    return [
      { role: "system", content: system },
      { role: "user", content: question }
    ];
  }
  const messagesContent = await fs.readFile(
    path.join(__dirname, "messages.json"),
    "utf-8"
  );
  messages = JSON.parse(messagesContent);
  return messages;
}

async function queryDatabase(query: string) {
  let url = "https://centrala.ag3nts.org/apidb";
  let body = {
    task: "database",
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
  return response.data;
}

async function performQuery(messages: ChatCompletionMessageParam[]) {
  const response = await openai.chat.completions.create({
    model,
    messages,
  });
  let assistantResponse = response.choices[0].message.content;
  assistantResponse = removeMarkdown(assistantResponse || '');
  messages.push({ role: "assistant", content: assistantResponse });
  await fs.writeFile(path.join(__dirname, "messages.json"), JSON.stringify(messages), "utf-8");
  return assistantResponse;
}

function removeMarkdown(text: string): string {
  let split = text.split('\r\n');
  split = split.filter(line => !line.startsWith('```'));
  return split.join('\r\n');
}

const messages = await prepareMessages();
let answer: (number | string)[] = [];
for (let i = 0; i < 10; i++) {
  let response = await performQuery(messages);
  if(!response)
    break;
  console.log(`AI: ${response}`);
  let jsonResponse = JSON.parse(response);
  if(jsonResponse.answer && Array.isArray(jsonResponse.answer)) {
    answer = jsonResponse.answer as (number | string)[];
    if(answer.length !== 0) {
      console.log(`DB: ${answer}`);
      break;
    }
  }
  response = await queryDatabase(jsonResponse.query);
  response = JSON.stringify(response);
  console.log(`DB: ${response}`);
  if(!response)
    break;
  messages.push({ role: "user", content: response });
}
report('database', answer);