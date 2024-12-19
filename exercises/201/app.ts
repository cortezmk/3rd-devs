import { OpenAIService } from "./OpenAIService";
import { promises as fs } from "fs";
import path from "path";

async function getAudioFiles(directoryPath: string) {
  try {
    const files = (await fs.readdir(directoryPath)).filter((file) =>
      file.endsWith(".m4a")
    );
    files.forEach((file) => {
      transcribeFile(file);
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
}

const openaiService = new OpenAIService();

async function transcribeFile(file: string) {
  let name = file.split(".")[0];
  console.log(`Transcribing file: ${file}`);
  const audioFile = await fs.readFile(`../nagrania/${file}`);
  const transcription = await openaiService.transcribeGroq(Buffer.from(audioFile.buffer));
  console.log(`${name}: ${transcription}`);
  const outputFilePath = path.join(__dirname, 'transcriptions.txt');
  await fs.appendFile(outputFilePath, `${name}: ${transcription}\n`);
}

getAudioFiles("../nagrania");