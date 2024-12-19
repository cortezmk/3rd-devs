import OpenAI from "openai";
import { promises as fs } from "fs";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import axios from 'axios';

const url = "https://xyz.ag3nts.org/verify";

const system = await fs.readFile("./exercises/002/system.txt", "utf-8");
let conversation: ChatCompletionMessageParam[] = [
  { role: "system", content: system },
];

function getQuestionFlag(response: string): string {
  const pattern = /{{FLG:([a-zA-Z0-9]+)}}/;
  const match = response.match(pattern);
  return match ? match[1] : '';
}

type Response = {
  text: string;
  msgID: string;
}

const openai = new OpenAI();

async function answerVerifier(text: string, msgId: string): Promise<Response> {
  let body = { msgID: msgId, text: text };
  let response = await axios.post(url, body);
  let question = await response.data;
  return question as Response;
}

async function askVerified(text: string, conversation: ChatCompletionMessageParam[]) {
  conversation.push({ role: "user", content: text });
  const chatCompletion = await openai.chat.completions.create({
    messages: conversation,
    model: "gpt-4o-mini",
    temperature: 0,
  });
  response = chatCompletion.choices[0].message?.content?.trim() || '';
  conversation.push({ role: "assistant", content: response });
  return response;
}

let msgId = '0';
let response: string = 'READY';

for (let i = 0; i < 5; i++) {
  console.log(`person: ${response}`);
  let question = await answerVerifier(response, msgId);
  console.log(`robot: ${question.text}`);
  msgId = question.msgID;
  let questionFlag = getQuestionFlag(question.text);
  if(questionFlag) {
    console.log(`FLAG: ${questionFlag}`);
    break;
  }
  response = await askVerified(question.text, conversation);
}
