import { Configuration, OpenAIApi } from "openai";
import { getConfigVariable } from "./util.js";

export default class OpenAiService {
  #openAi;
  #model;

  constructor() {
    const apiKey = getConfigVariable("OPENAI_API_KEY");
    const model = getConfigVariable("OPENAI_MODEL");

    const configuration = new Configuration({
      apiKey,
    });

    this.#openAi = new OpenAIApi(configuration);
    this.#model = model;
  }

  async classify(categories, destinationName, description, type) {
    try {
      const prompt = this.#generatePrompt(
        categories,
        destinationName,
        description,
        type
      );

      const response = await this.#openAi.createCompletion({
        model: this.#model,
        prompt,
        max_tokens: 10,
      });

      let guess = response.data.choices[0].text;
      guess = guess.replace("\n", "");
      guess = guess.trim();

      if (categories.indexOf(guess) === -1) {
        console.warn(`OpenAI could not classify the transaction. 
                Prompt: ${prompt}
                OpenAIs guess: ${guess}`);
        return null;
      }

      return {
        prompt,
        response: response.data.choices[0].text,
        category: guess,
      };
    } catch (error) {
      if (error.response) {
        console.error(error.response.status);
        console.error(error.response.data);
        throw new OpenAiException(
          error.status,
          error.response,
          error.response.data
        );
      } else {
        console.error(error.message);
        throw new OpenAiException(null, null, error.message);
      }
    }
  }

  #generatePrompt(categories, destinationName, description, type) {
    return `
I want to categorize transactions on my bank account.
Just output the name of the category.
Does not have to be a complete sentence.
Ignore any long string of numbers or special characters.
The subject is in Mexican Spanish.
In which category would a transaction (${type}) from "${destinationName}" with the subject "${description}" fall into?
The categories are: 

${categories.join(", ")}
`;
  }
}

class OpenAiException extends Error {
  code;
  response;
  body;

  constructor(statusCode, response, body) {
    super(`Error while communicating with OpenAI: ${statusCode} - ${body}`);

    this.code = statusCode;
    this.response = response;
    this.body = body;
  }
}
