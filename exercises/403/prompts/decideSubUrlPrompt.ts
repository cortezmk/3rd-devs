export default (question: string) => `
<objective>Find the link which would most likely contain the answer to the question: ${question}</objective>
<rules>
- you will be given a markdown scrap of a webpage as input
- look for the link which would most likely contain the answer to the question
- if you can't find any link, set "isOk" field to false
- the proper link:
  if the markdown is like for example:
  [Sprawdź nasze usługi](/uslugi)
  the proper link would be "/uslugi"
</rules>
<response>
Respond in JSON format DON'T WRAP IT IN MARKDOWN!:
{
  "thinking": (Provide some context on how you are trying to find the answer),
  "isOk": (set to true if you found the answer, false otherwise),
  "answer": (the link to the page that most likely contains the answer)
}
</response>
`;