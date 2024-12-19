export default (question: string) => `
<objective>Find the answer to the question: ${question}</objective>
<rules>
- you will be given a markdown scrap of a webpage as input
- try to find answer to give n question on that page
- if you can't find the answer set "isOk" field to false
</rules>
<response>
Respond in JSON format DON'T WRAP IT IN MARKDOWN!:
{
  "thinking": (Provide some context on how you are trying to find the answer),
  "isOk": (set to true if you found the answer, false otherwise),
  "answer": (The answer to the question, if can't find the answer set it to null)
}
</response>
`;