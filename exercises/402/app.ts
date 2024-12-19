import { promises as fs } from "fs";
import path from "path";
import { OpenAIService } from "./OpenAIService";
import type { ChatCompletion } from "openai/resources/chat/completions.mjs";
import { report } from "../tools";

type Resp = {
  label: string;
  value: string;
};

const verify = await fs.readFile(path.join(__dirname, "verify.txt"), "utf-8");
const openai = new OpenAIService();
const resultsPath = path.join(__dirname, "results.json");
const model =
  "ft:gpt-4o-mini-2024-07-18:personal:lab-data:AYFXkMBW:ckpt-step-478";

async function verifyResults(results: Resp[]) {
  let r = results.filter(r => r.value === 'correct');
  let rr = r.map(r => r.label);
  console.log(JSON.stringify(rr, null, 2));
  report('research', rr)
}

async function main() {
  let lines = verify.split("\n").map((line) => {
    let split = line.split("=");
    return { label: split[0], value: split[1] };
  });
  let results: Resp[] = [];
  if(await fs.exists(resultsPath)) {
    results = JSON.parse(await fs.readFile(resultsPath, "utf-8"));
    await verifyResults(results);
    return;
  }
  for (let i = 0; i < lines.length; i++) {
    const response = await openai.completion({
      model,
      messages: [{ role: "user", content: lines[i].value }],
    });
    const resp = (response as ChatCompletion).choices[0].message.content || "";
    results.push({ label: lines[i].label, value: resp });
  }
  await fs.writeFile(
    resultsPath,
    JSON.stringify(results, null, 2),
    "utf-8"
  );
  await verifyResults(results);
}

await main();