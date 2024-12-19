export default () => `
<objective>Rank the given link to how likely the answer to the given question might be found there</objective>
<rules>
- you will be given a question and a link in a markdown format:

  question
  [link text](/sub-url "(tooltip content)")

  for example:
  Podaj adres mailowy do firmy SoftoAI
  [Blog](/aktualnosci "Co wydarzyło się w naszej firmie?")
- determine based on the link text how likely the answer to the question might be found there
- rank it as a float nubmer between 0 and 1 where 0 means not likely and 1 means very likely
</rules>
<response>
Respond in JSON format DON'T WRAP IT IN MARKDOWN!:
{
  "thinking": (Provide some context on how you are trying to find the answer),
  "rank": (the rank of the link as a float number between 0 and 1)
}
</response>
<examples>

user:
Podaj adres mailowy do firmy SoftoAI
[Sprawdź nasze usługi](/uslugi)
assistant:
{
  "thinking": "Email address is a type of contact. The link text mentions services, so it's not very likely to contain the email address. However, services might contain contact information, so it's not impossible.",
  "rank": 0.5
}

user:
Podaj adres mailowy do firmy SoftoAI
[Portfolio](/portfolio "Opisy naszych ostatnich realizacji dla klientów")
assistant:
{
  "thinking": "Typicaly, no contact information is provided in portfolios, so it's very unlikely that the email would be provided there.",
  "rank": 0.2
}

user:
Podaj adres mailowy do firmy SoftoAI
[Kontakt](/kontakt "Zadzwoń do nas, wyślij maila lub odwiedź nas osobiście")
assistant:
{
  "thinking": "Email address is a type of contact, as it states in this link. The link text also mentions sending an email, so it's very likely that the email address might be found there.",
  "rank": 0.95
}

`;