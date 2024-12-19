import describeMapPrompt from "./prompts/describeMapPrompt";
import { OpenAIService } from "./OpenAIService";
import { promises as fs } from "fs";
import path from "path";
import img2b64 from "image-to-base64";
import type { ChatCompletion } from "openai/resources/chat/completions.mjs";

const model = 'gpt-4o-mini';
const openai = new OpenAIService();

async function describeImages(outputDir: string) {
  const files = await fs.readdir(outputDir);
  for (const file of files) {
    if (path.extname(file) === '.png') {
      const imagePath = path.join(outputDir, file);
      const base64 = await img2b64(imagePath);
      const response = await openai.completion({
        model,
        messages: [
          { role: "system", content: describeMapPrompt() },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64}`,
                },
              },
            ],
          },
        ],
      });
      const text =
        (response as ChatCompletion)?.choices[0].message.content || "";
      const textFilePath = `${imagePath}.img.txt`;
      await fs.writeFile(textFilePath, text);
      console.log(`Description for ${file}: ${text}`);
    }
  }
}

await describeImages(path.join(__dirname, 'mapy'));