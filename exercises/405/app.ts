import { PDFDocument } from 'pdf-lib';
import { convert } from 'pdf-poppler';
import fs from 'fs/promises';
import path from 'path';
import { OpenAIService } from './OpenAIService';
import img2b64 from 'image-to-base64';
import type { ChatCompletion } from 'openai/resources/chat/completions.mjs';
import getTextPrompt from './prompts/getTextPrompt';
import describeImagesPrompt from './prompts/describeImagesPrompt';
import answerPrompt from './prompts/answerPrompt';
import sharp from 'sharp';
import { getData, performCachedChatCompletion, report } from '../tools';

const pdfPath = path.join(__dirname, 'notatnik-rafala.pdf');
const outputDir = path.join(__dirname, 'pages');
const resizedOutputDir = path.join(__dirname, 'pages_resized');

const model = 'gpt-4o-mini';

async function convertPdfToImages(pdfPath: string, outputDir: string) {
  const pdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const numPages = pdfDoc.getPageCount();
  for (let i = 0; i < numPages; i++) {
    const page = pdfDoc.getPage(i);
    const outputFilePath = path.join(outputDir, `page-${i + 1}.png`);
    await convert(pdfPath, {
      format: 'png',
      out_dir: outputDir,
      out_prefix: `page-${i + 1}`,
      page: i + 1,
      scale: 1024,
    });
    console.log(`Saved page ${i + 1} as image: ${outputFilePath}`);
  }
}

async function resizeImage(imagePath: string): Promise<string> {
  const outputFilePath = imagePath
    .replace('pages', 'pages_resized')
    .replace('.png', '_resized.png');
  await sharp(imagePath)
    .resize(256, 256)
    .toFile(outputFilePath);
  return outputFilePath;
}

const openai = new OpenAIService();

async function readTextFromImages(outputDir: string) {
  const files = await fs.readdir(outputDir);
  for (const file of files) {
    if (path.extname(file) === '.png') {
      let imagePath = path.join(outputDir, file);
      console.log(`Reading text from ${imagePath}`);
      // imagePath = await resizeImage(imagePath);
      const base64 = await img2b64(imagePath);
      const response = await openai.completion({
        model,
        messages: [
          { role: "system", content: getTextPrompt() },
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
      const textFilePath = `${imagePath}.txt`;
      await fs.writeFile(textFilePath, text);
      console.log(`Saved text from ${file} to ${textFilePath}`);
    }
  }
}

async function resizeImages(outputDir: string) {
  const files = await fs.readdir(outputDir);
  for (const file of files) {
    if (path.extname(file) === '.png') {
      const imagePath = path.join(outputDir, file);
      await resizeImage(imagePath);
    }
  }
}

async function describeImages(outputDir: string) {
  const files = await fs.readdir(outputDir);
  for (const file of files) {
    if (path.extname(file) === '.png') {
      const imagePath = path.join(outputDir, file);
      const base64 = await img2b64(imagePath);
      const response = await openai.completion({
        model,
        messages: [
          { role: "system", content: describeImagesPrompt() },
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

async function combineTextFiles(outputDir: string) {
  const files = await fs.readdir(outputDir);
  const textFiles = files.filter((file) => file.endsWith('png.txt'));
  const imageFiles = files.filter((file) => file.endsWith('img.txt'));
  const textFilePath = path.join(__dirname, 'combined.txt');
  for (let i = 0; i < textFiles.length; i++) {
    const txtFile = path.join(outputDir, textFiles[i]);
    const imgFile = path.join(outputDir, imageFiles[i]);
    if(await fs.exists(txtFile)) {
      const text = await fs.readFile(txtFile, 'utf-8');
      await fs.appendFile(textFilePath, `${text}\n`);
    }
    if(await fs.exists(imgFile)) {
      const text = await fs.readFile(imgFile, 'utf-8');
      await fs.appendFile(textFilePath, `${text}\n`);
    }
  }
  console.log(`Combined text files to ${textFilePath}`);
}

async function combineTextFiles2() {
  const textFilePath = path.join(__dirname, 'combined.txt');
  for(let i = 1; i <= 19; i++) {
    const baseName = `page-${i}-${i.toString().padStart(2, '0')}`;
    const txtFile = path.join(__dirname, 'pages', `${baseName}.png.txt`);
    if(await fs.exists(txtFile)) {
      const text = await fs.readFile(txtFile, 'utf-8');
      await fs.appendFile(textFilePath, `${text}\n`);
    }
    const imgFile = path.join(__dirname, 'pages_resized', `${baseName}_resized.png.img.txt`);
    if(await fs.exists(imgFile)) {
      const text = await fs.readFile(imgFile, 'utf-8');
      await fs.appendFile(textFilePath, `${text}\n`);
    }
  }
  console.log(`Combined text files to ${textFilePath}`);
}

async function getQuestions() {
  const questions = await getData('notes.json');
  fs.writeFile(path.join(__dirname, 'questions.json'), JSON.stringify(questions), 'utf-8');
}

async function answerQuestion(id: number) {
  const qtext = await fs.readFile(path.join(__dirname, 'questions.json'), 'utf-8');
  const questions = JSON.parse(qtext);
  const question = questions[`0${id}`];
  const combined = await fs.readFile(path.join(__dirname, 'combined.txt'), 'utf-8');

  await performCachedChatCompletion({
    __dirname,
    model,
    messages: [
      { role: "system", content: answerPrompt(question) },
      {
        role: "user",
        content: combined,
      },
    ],
    cacheName: path.join('answers', `0${id}`),
  });
}

async function sendAnswers() {
  let answers: Record<string, string> = {};
  for(let i = 1; i <= 5; i++) {
    const answerPath = path.join(__dirname, 'answers', `0${i}-gpt-4o-mini.txt`);
    const text = await fs.readFile(answerPath, 'utf-8');
    const data = JSON.parse(text);
    answers[`0${i}`] = data.answer.toString();
  }
  answers['04'] = '2024-11-12';
  const response = await report('notes', answers);
}

//await combineTextFiles(resizedOutputDir);

//await readTextFromImages(outputDir);

//await combineTextFiles2();

//await getQuestions();

// await answerQuestion(1);

await sendAnswers();