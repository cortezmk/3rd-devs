import { JSDOM } from 'jsdom';
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const url = 'https://xyz.ag3nts.org/';

let response = await fetch(url);
let text = await response.text();

const dom = new JSDOM(text);
const document = dom.window.document;
const element = document.getElementById('human-question');
const question = element?.textContent?.split(':')[1].trim();

const openai = new OpenAI();
const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: "You are helpful assistant. You will be given a question which can be answered only by number. Please answer ONLY by that number." },
    { role: "user", content: question || "" }
];
const chatCompletion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o-mini",
    temperature: 0,
});
const answer = chatCompletion.choices[0].message?.content?.trim();

console.log(question);
console.log(answer);

if (answer) {
    response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `username=tester&password=574e112a&answer=${answer}`
    });
    text = await response.text();
    console.log(text);
}