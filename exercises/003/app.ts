import OpenAI from "openai";
import { promises as fs } from "fs";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import axios from 'axios';

const incorrect = await fs.readFile("./exercises/003/file.json", "utf-8");
const incorrectJson = JSON.parse(incorrect);

type DataEntry = {
  question: string;
  answer: string;
  test: TestEntry | undefined;
}

type TestEntry = {
  q: string;
  a: string | undefined;
}

const openai = new OpenAI();

let data = incorrectJson["test-data"] as DataEntry[];
for (let i = 0; i < data.length; i++) {
  let entry = data[i];
  entry.answer = eval(entry.question).toString();
  if (entry.test) {
    let conversation: ChatCompletionMessageParam[] = [
      { role: "user", content: entry.test.q },
    ];
    const answer = await openai.chat.completions.create({
      messages: conversation,
      model: "gpt-4o-mini",
      temperature: 0,
    });
    entry.test.a = answer.choices[0].message?.content?.trim();
    console.log(`Q: ${entry.test.q}`);
    console.log(`A: ${entry.test.a}`);
  }
}
fs.writeFile("./exercises/003/correct.json", JSON.stringify(incorrectJson));

let url = 'https://centrala.ag3nts.org/report';
let body = {
  "task": "JSON",
  "apikey": "2c6186e1-adb3-400d-83be-dd5d04563b68",
  "answer": incorrectJson
};
let response = await axios.post(url, body);
let answer = await response.data;
console.log(answer);
