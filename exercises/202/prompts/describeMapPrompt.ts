export default () => `
<objective>
Describe the fragment of city map from given image.
</objective>
<rules>
- You will receive one map fragment image from the user.
- This map fragment image will contain a small portion of a city map.
- You need to describe the map fragment in the image.
- Pay attention to names of streets, and which street connects to which street.
- Pay attention to the names of buildings, and what type of buildings are there.
- Pay attention to the transportation stops and on which street are they located.
</rules>
<response>
- Respond with JSON format (respond with JSON only - DO NOT wrap it in markdown):
{
  "thinking": (describe your thought process),
  "response": (describe the map fragment)
}
</response>
`;