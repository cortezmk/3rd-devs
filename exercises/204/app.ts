import OpenAI, { toFile } from "openai";
import { promises as fs } from "fs";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import axios from 'axios';
import path from "path";

const openai = new OpenAI();
const apiKey = '2c6186e1-adb3-400d-83be-dd5d04563b68';

async function getFiles(directoryPath: string): Promise<any> {
  try {
    let result = {} as any;
    const files = await fs.readdir(directoryPath);
    for(let i = 0; i < files.length; i++) {
      let file = files[i];
      console.log(file);
      let category = await processFile(`${directoryPath}/${file}`);
      if(!result[category]) {
        result[category] = [file];
      } else {
        result[category].push(file);
      }
    }
    return result;
  } catch (error) {
    console.error("Error reading directory:", error);
  }
  return {};
}

async function report(taskId: string, answer: any) {
  let url = 'https://centrala.ag3nts.org/report';
  let body = {
    "task": taskId,
    "apikey": apiKey,
    "answer": answer
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
  let resp = await response.data;
  console.log(resp);
}

async function transcribeFile(filePath: string): Promise<string> {
  let audioFile = await fs.readFile(filePath);
  let name = path.basename(filePath);
  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(audioFile, `${name}.mp3`),
    model: 'whisper-1',
  });
  return transcription.text;
}

async function readFromImageFile(filePath: string): Promise<string> {
  const image = await fs.readFile(filePath);
  const base64Image = Buffer.from(image).toString('base64');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an OCR assistant. Please extract the text from the given image.' },
      { role: 'user', content: [
          {
            type: 'image_url',
            image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'low'
              },
          },
        ] 
      }
    ]
  });
  return response.choices[0].message.content || '';
}

async function getFileContent(filePath: string): Promise<string> {
  switch(filePath.split('.').pop()) {
    case 'txt':
      return await fs.readFile(filePath, 'utf-8');
    case 'png':
      return await readFromImageFile(filePath);
    case 'mp3':
      return await transcribeFile(filePath);
    default:
      return '';
  }
}

const system = await fs.readFile("./exercises/204/system.txt", "utf-8");

async function determineContentCategory(content: string): Promise<string> {
  console.log(`Determining content category for: ${content}`);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content }
    ]
  });
  try {
    const json = JSON.parse(response.choices[0].message.content || '{}');
    console.log(`Thinking: ${json.thinking}`);
    console.log(`Category: ${json.category}`);
    return json.category;
  } catch (error) {
    console.error('Error parsing JSON response:', error, response.choices[0].message.content);
    return '';
  }
}

async function processFile(filePath: string): Promise<string> {
  console.log(`Processing file: ${filePath}`);
  const content = await getFileContent(filePath);
  console.log(`Content: ${content}`);
  let category = await determineContentCategory(content);
  return category;
}

let c = await fs.readFile('../pliki/2024-11-12_report-00-sektor_C4.txt', 'utf-8');
console.log(c);

let results = await getFiles('../pliki');
results['people'] = (results['people'] as []).sort();
results['hardware'] = (results['hardware'] as []).sort();

// let results = {"people":["2024-11-12_report-00-sektor_C4.txt","2024-11-12_report-04-sektor_B2.txt","2024-11-12_report-10-sektor-C1.mp3","2024-11-12_report-11-sektor-C2.mp3","2024-11-12_report-12-sektor_A1.mp3","2024-11-12_report-15.png","2024-11-12_report-16.png"],"hardware":["2024-11-12_report-05-sektor_C1.txt","2024-11-12_report-09-sektor_C2.txt","2024-11-12_report-13.png","2024-11-12_report-17.png"]};

let r = {
  people: results['people'].sort(),
  hardware: results['hardware'].sort()
}
console.log(JSON.stringify(r));
// report('kategorie', r);
