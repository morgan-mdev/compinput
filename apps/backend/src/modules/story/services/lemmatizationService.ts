import { Lemma } from "../story.types";
import axios from "axios";
import openai from "../../../services/openaiClient";

export class LemmatizationService {
  async lemmatize(text: string): Promise<Lemma[]> {
    const response = await axios.post("http://localhost:8000/lemmatize", {
      text,
    });
    return response.data.lemmas;
  }

  async translateLemmas(lemmas: Lemma[]): Promise<
    {
      lemma: string;
      translation: string;
      example_sentence: string;
      translation_example_sentence: string;
    }[]
  > {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: `You are a helpful and context-aware translator. Your task is to translate the following lemmas (base word forms) into natural English, using the sentence as context.

          For each lemma:
          - Translate **only the lemma**, not the sentence.
          - Use the **sentence only as context** to choose the most appropriate meaning.
          - Consider the lemma’s **part of speech** (e.g., noun, verb, adjective).
          - If the word has multiple meanings, provide the **most likely one** in this context. You may include **multiple translations**, separated by commas.
          - Avoid literal or overly generic translations if a more specific or idiomatic meaning fits better.
          - Keep the lemma in its base form.
          - Do **not** include proper names (e.g., Max, Berlin) in the response — skip them entirely.

          In addition, for each lemma:
          - Create a **simple original example sentence** in German using the lemma naturally.
          - Then provide the **English translation** of your example sentence.
          - The example sentence should be short, natural, and helpful for learners. Do not copy from the input sentence — generate a **new** one.
          `,
        },
        {
          role: "user",
          content: `Here are the lemmas: ${JSON.stringify(
            lemmas.map((lemma) => ({
              lemma: lemma.lemma,
              sentence: lemma.sentence,
            }))
          )}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "translation",
          schema: {
            type: "object",
            properties: {
              lemmas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    lemma: { type: "string" },
                    translation: { type: "string" },
                    example_sentence: { type: "string" },
                    translation_example_sentence: { type: "string" },
                  },
                  required: [
                    "lemma",
                    "translation",
                    "example_sentence",
                    "translation_example_sentence",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["lemmas"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.output_text;
    if (!content) {
      throw new Error("No content returned from translation service");
    }

    return JSON.parse(content).lemmas;
  }
}
