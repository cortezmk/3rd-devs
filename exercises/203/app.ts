import OpenAI from "openai";
import { promises as fs } from "fs";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import axios from 'axios';

const apiKey = '2c6186e1-adb3-400d-83be-dd5d04563b68';

async function getQuestion(): Promise<any> {
  let r = await axios.get(`https://centrala.ag3nts.org/data/${apiKey}/robotid.json`);
  return r.data as any;
}

let question = (await getQuestion()).description;
console.log(question);
let system = await fs.readFile("./exercises/203/system.txt", "utf-8");

const openai = new OpenAI();
let conversation: ChatCompletionMessageParam[] = [
  { role: "system", content: system },
  { role: "user", content: (await getQuestion()).description }
];

const answer = await openai.chat.completions.create({
  messages: conversation,
  model: "gpt-4o",
  temperature: 0,
});

console.log(JSON.stringify(answer.choices[0].message.content));

let imageResult = await openai.images.generate({
  prompt: `Create an image of robot based on given characteristics: ${answer.choices[0].message.content}`,
  model: "dall-e-3",
  n: 1,
  size: '1024x1024',
  response_format: 'url'
});

console.log(JSON.stringify(imageResult.data[0].url));

async function checkResponse(q: string) {
  try {
    let url = 'https://centrala.ag3nts.org/report';
    let body = {
      "task": "robotid",
      "apikey": apiKey,
      "answer": q
    };
    let response = await axios.post(url, body, {
      headers: {
        "Accept": "*/*",
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Accept-Encoding": "gzip, deflate, br",
      }
    });
    let answer = await response.data;
    console.log(answer);
  }
  catch (error: any) {
    console.log(error.response.data.message);
  }
}

let aa = await checkResponse(imageResult.data[0].url || '');
console.log(aa);