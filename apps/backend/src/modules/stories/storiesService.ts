import openai from "../../services/openaiClient";
import { StoriesRepository } from "./storiesRepository";
import { VocabularyService } from "../vocabulary/vocabularyService";
import { StorageResponse } from "../../types/repositories";
import { Base64 } from "../../types/types";

const vocabularyService = new VocabularyService();
const storiesRepository = new StoriesRepository();

export class StoriesService {
  async generateStory(): Promise<string> {
    const words = await vocabularyService.getWords();
    const targetLanguageWords = words.map((word) => word.word);

    const story = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
            You are given a list of German words that I've learned. I want to practice reading now. I want you to create a story in German. But this story should meet some requirements:

            1. 98% of the words in the story should be the words from the list I provided. Other words should be new to me, but similar by level of difficulty. 
            2. All story should use only present tense
            3. Use these guidelines to create an engagement story:
            - Avoid using very generalized phrasing
            - Add a personal voice/tone/touch to the text
            - Don't overuse repetitive sentence structures
            - Avoid using very polished and neutral tone
            - Use specific examples
            - Don't use artificially smooth transitions
            - Avoid generic and overexplained points
            - Avoid formulaic expressions
            - Use natural flow and variations in sentence structure
            - Always use specific personal details, to make the text look like it was written by a human. Add such details, that only a real human being could include in the text.

            Create a story that is engaging and interesting to read.
            Story should be 2 sentences long.
            `,
        },
        {
          role: "user",
          content: `Here are the words: ${targetLanguageWords.join(", ")}`,
        },
      ],
    });

    const storyText = story.choices[0].message.content;
    if (!storyText) {
      throw new Error("No story text returned");
    }
    // remove \n symbols
    const cleanedStoryText = storyText.replace(/\n/g, "");

    return cleanedStoryText;
  }

  async translateStory(
    story: string
  ): Promise<{ chunk: string; translatedChunk: string }[]> {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: `You are a helpful translator. Your task is to:
          1. Break down the given story into meaningful chunks (7-8 words. It can be either a full sentence, or just a part of a sentence)
          2. Translate each chunk to English
          3. Return the chunks in a structured format with both original and translated text
          
          Guidelines:
          - Keep chunks at a reasonable length (7-8 words)
          - Maintain the original meaning and tone
          - Preserve any cultural context
          - Ensure translations are natural and fluent in English
          `,
        },
        {
          role: "user",
          content: story,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "translation",
          schema: {
            type: "object",
            properties: {
              chunks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    chunk: { type: "string" },
                    translatedChunk: { type: "string" },
                  },
                  required: ["chunk", "translatedChunk"],
                  additionalProperties: false,
                },
              },
            },
            required: ["chunks"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.output_text;
    if (!content) {
      throw new Error("No content returned from translation service");
    }

    const result = JSON.parse(content);
    if (!result.chunks || !Array.isArray(result.chunks)) {
      throw new Error("Invalid response format from translation service");
    }

    return result.chunks;
  }

  async textToSpeech(text: string, isTargetLanguage: boolean): Promise<Base64> {
    const instructions = isTargetLanguage
      ? "Speak as you are voiceover a story for 'Comprehensible Input' method of learning. You must speak in a slow pace. Speak expressively. The language is German"
      : "Calm voice, narrator style. The language is English";
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "shimmer",
      input: text,
      instructions,
    });

    const buffer = await Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");
    return base64;
  }

  async saveStoryToStorage(story: Base64): Promise<StorageResponse<string>> {
    const fileName = await storiesRepository.saveStoryToStorage(story);
    return fileName;
  }
}
