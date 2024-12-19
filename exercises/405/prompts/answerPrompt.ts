export default (question: string) => `
<objective>
You will be given some notes from person named Rafał. Answer the question: "${question}" based on the notes.
</objective>
<rules>
- The notes may contain images. Their descriptions are surrounded by square brackets.
</rules>
<response>
respond with JSON format (DO NOT wrap the JSON in markdown code block):
{
  "thinking": (give a brief explanation of your thought process),
  "answer": (your answer)
}
</response>
`;