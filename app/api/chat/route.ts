import { StreamingTextResponse, Message } from 'ai';
import { ChatCohere } from "@langchain/cohere";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const currentMessageContent = messages[messages.length - 1].content;

    const vectorSearch = await fetch("http://localhost:3000/api/vectorSearch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: currentMessageContent }),
    }).then((res) => res.json());

    const contextSections = vectorSearch.results ? vectorSearch.results.map((result: any) => result.text).join('\n\n') : '';

    let TEMPLATE;

    if (contextSections) {
      TEMPLATE = `You are a very enthusiastic freeCodeCamp.org representative who loves to help people! Given the following sections from the freeCodeCamp.org contributor documentation, answer the question using only that information, outputted in markdown format. If you are unsure and the answer is not explicitly written in the documentation, say "Sorry, I don't know how to help with that."

      Context sections:
      ${contextSections}

      Question: """
      ${currentMessageContent}
      """
      `;
    } else {
      TEMPLATE = `You are a very enthusiastic freeCodeCamp.org representative who loves to help people! Please answer the following question to the best of your ability, outputted in markdown format:

      Question: """
      ${currentMessageContent}
      """
      `;
    }

    messages[messages.length - 1].content = TEMPLATE;

    const llm = new ChatCohere({
      apiKey: process.env.COHERE_API_KEY,
      model: "command-r-plus",
      streaming: true,
    });

    const chainedMessages = (messages as Message[]).map(m =>
      m.role === 'user'
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    );

    const stream = await llm.stream(chainedMessages);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'An error occurred during the chat process' }), { status: 500 });
  }
}
