import { serve } from "bun";
import map from "./map";
import { performCachedCompletion, report } from "../tools";
import navigator from "./prompts/navigator";

const model = 'gpt-4o-mini';

type Instruction = {
  instruction: string;
}

type Response = {
  thinking: string;
  answer: number[];
}

async function main(ins: Instruction): Promise<string> {
  let result = await performCachedCompletion<Response>({
    __dirname,
    model,
    system: navigator(),
    question: ins.instruction,
    cacheName: "cache",
  });
  return map[result.answer[0]][result.answer[1]];
}

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if(url.pathname === "/ask") {
      const resp = await report("webhook", "https://azyl-51893.ag3nts.org");
      console.log(JSON.stringify(resp, null, 2));
    }
    //let description = await main({ instruction: "poleciałem jedno pole w prawo, a później na sam dół" });
    let description = await main(await req.json() as Instruction);
    return new Response(JSON.stringify({description}, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});

console.log(`Server is running on http://localhost:${server.port}`);