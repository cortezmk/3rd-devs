import { promises as fs } from "fs";
import path from "path";
import { mapFiles, report } from "../tools";

const factsDir = "C:\\Users\\mateusz.kortas\\source\\ai_devs\\pliki\\facts\\";
const txtDir = "C:\\Users\\mateusz.kortas\\source\\ai_devs\\pliki\\";

const factsMap = await mapFiles({
  __dirname,
  sourceDir: factsDir,
  cacheFile: "factsMap.json",
  systemPromptFile: "extractFacts.txt",
});
console.log(factsMap);

const txtPersonMap = await mapFiles({
  __dirname,
  sourceDir: txtDir,
  sourceFilter: (file) => path.extname(file) === ".txt",
  cacheFile: "txtPersonMap.json",
  systemPromptFile: "extractPersonText.txt",
});
console.log(txtPersonMap);

let txtFactMap: Record<string, string> = {};
for (const [file, person] of Object.entries(txtPersonMap)) {
  for (const [file1, person1] of Object.entries(factsMap)) {
    if (person.includes(person1)) {
      txtFactMap[file] = file1;
    }
  }
}
console.log(txtFactMap);

let txtMetadataMapContentProcessor = async (
  fileName: string,
  content: string
) => `
<record_name>
${path.basename(fileName)}
</record_name>
<person_data>
${
  txtFactMap[fileName]
    ? await fs.readFile(path.join(factsDir, txtFactMap[fileName]), "utf-8")
    : "no person data"
}
</person_data>
<investigation_data>
${content}
</investigation_data>
`;
const txtMetadataMap = await mapFiles({
  __dirname,
  sourceDir: txtDir,
  sourceFilter: (file) => path.extname(file) === ".txt",
  contentProcessor: txtMetadataMapContentProcessor,
  cacheFile: "txtMetadataMap.json",
  systemPromptFile: "extractTxtMetadata.txt",
});
console.log(txtMetadataMap);

await report("dokumenty", txtMetadataMap);