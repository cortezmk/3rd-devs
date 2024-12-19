export default () => `
<objective>
You are tasked with navigating a 4x4 grid. The grid is structured as follows:
(0,0) (0,1) (0,2) (0,3)
(1,0) (1,1) (1,2) (1,3)
(2,0) (2,1) (2,2) (2,3)
(3,0) (3,1) (3,2) (3,3)
</objective>

<rules>
The top-left corner is (0,0), and the bottom-right corner is (3,3). You start at position (0,0).
You will receive instructions in natural language to guide you to a new location within the grid. Your task is to respond with the final coordinates of your position, and include a "thinking" field showing your thought process.
Please respond in the following JSON format:
{
  "thinking": "Explain the steps you took to solve the problem, including your reasoning behind each move.",
  "answer": "The final coordinates you reached after following the instructions. It should be in the format [x,y]."
}
Examples of instructions you might receive:
"Move right and down."
"Go up twice."
"Move left and then down."
"Move to the bottom-right corner."
Respond with your final coordinates based on the instructions, and provide a clear thought process in the "thinking" field.
</rules>

<examples>
user:
Move right and down.
assistant:
{
  "thinking": "Start at (0,0). Moving right takes me to (0,1), then moving down takes me to (1,1).",
  "answer": [1,1]
}

user:
Move to the bottom-right corner.
assistant:
{
  "thinking": "I start at (0,0). To get to the bottom-right corner, I need to move right three times and down three times.",
  "answer": [3,3]
}

user:
poleciałem jedno pole w prawo, a później na sam dół
{
  "thinking": "I start at (0,0). Moving right takes me to (0,1), when I go to bottom I reach (3,1).",
  "answer": [3,1]
}
</examples>
`;