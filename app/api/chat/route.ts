import { StreamingTextResponse, Message } from 'ai';
import { ChatCohere } from "@langchain/cohere";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Parse the incoming request to get the messages
    const { messages } = await req.json();
    const currentMessageContent = messages[messages.length - 1].content;

    // Log the action
    console.log("Sending request to vectorSearch API");

    // Send a request to the vectorSearch API to get context sections
    const vectorSearch = await fetch("http://localhost:3000/api/vectorSearch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: currentMessageContent }),
    }).then((res) => res.json());

    // Log the response from the vectorSearch API
    console.log("Received response from vectorSearch API:", vectorSearch);

    // Extract context sections from the vector search results
    const contextSections = vectorSearch.results ? vectorSearch.results.map((result: any) => result.text).join('\n\n') : '';

    // Log the context sections
    console.log("Context sections:", contextSections);

    // Define the template for the response based on the presence of context sections
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

    // Update the content of the last message with the template
    messages[messages.length - 1].content = TEMPLATE;

    // Initialize the ChatCohere instance with streaming enabled
    const llm = new ChatCohere({
      apiKey: process.env.COHERE_API_KEY,
      model: "command",
      streaming: true,
    });

    // Convert messages to the appropriate format for ChatCohere
    const chainedMessages = (messages as Message[]).map(m =>
      m.role === 'user'
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    );

    // Stream the response using the ChatCohere instance
    const stream = await llm.stream(chainedMessages);

    // Return the streaming response
    return new StreamingTextResponse(stream);
  } catch (error) {
    // Log any errors
    console.error('Error in chat route:', error);

    // Return an error response
    return new Response(JSON.stringify({ error: 'An error occurred during the chat process' }), { status: 500 });
  }
}
