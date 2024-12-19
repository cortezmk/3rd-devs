import { promises as fs } from "fs";
import path from "path";
import { getData } from "../tools";

const gps_question = await getData('gps_question.json');
fs.writeFile(path.join(__dirname, "gps_question.json"), JSON.stringify(gps_question), "utf-8");