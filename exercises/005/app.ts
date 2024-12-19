import OpenAI from "openai";
import { promises as fs } from "fs";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import axios from 'axios';

const system = await fs.readFile("./exercises/005/system.txt", "utf-8");
let conversation: ChatCompletionMessageParam[] = [
  { role: "system", content: system },
];

async function getQuestion(): Promise<string> {
  let r = await axios.get('https://centrala.ag3nts.org/data/2c6186e1-adb3-400d-83be-dd5d04563b68/cenzura.txt');
  return r.data;
}

async function askBot(question: string): Promise<string> {
  try {
    let body = `system=${system}&q=${question}`;
    console.log(body);
    let url = 'https://llama2.mateusz-kortas88.workers.dev';
    let response = await axios.post(url, body, {
        headers: {
          "Accept": "*/*",
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Accept-Encoding": "gzip, deflate, br",
        }
      }
    );
    console.log(response.data[0].response.response);
    return response.data[0].response.response;
  }
  catch (error) {
    console.log(error);
    return '';
  }
}

async function checkResponse(q: string) {
  try {
    let url = 'https://centrala.ag3nts.org/report';
  let body = {
    "task": "CENZURA",
    "apikey": "2c6186e1-adb3-400d-83be-dd5d04563b68",
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

let q = await getQuestion();
console.log(q);
let r = await askBot(q) as any;
console.log(r);
let j = JSON.parse(r);
console.log("step2 = " + j['step2']);
let solution = checkResponse(j['step2']);
console.log(solution);
