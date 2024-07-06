// src/services/chatGPTService.ts

import { Message, DialogueParams } from '../types/types';

export async function checkChatGPTToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello, ChatGPT!" }],
        max_tokens: 5
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error checking ChatGPT token:', error);
    return false;
  }
}

async function makeRequest(token: string, messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 150
      })
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from ChatGPT API:', errorData);
      throw new Error(`ChatGPT API error: ${errorData.error?.message || 'Unknown error'}`);
    }
  
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
  
    if (!content) {
      throw new Error('Получен пустой ответ от ChatGPT');
    }
  
    return content.trim();
  }
  
  export async function generateResponse(token: string, messages: Message[], params: DialogueParams): Promise<{ response: string, possibleResponses: string[] }> {
    try {
      // Генерация ответа актера
      const actorMessages = [
        { role: "system", content: `Вы играете роль ${params.actor} в ${params.place} и ведете диалог на тему ${params.topic}. Отвечайте кратко, в пределах 2-3 предложений.` },
        ...messages.map(msg => ({ role: msg.isUser ? "user" : "assistant", content: msg.text })),
      ];
  
      const actorResponse = await makeRequest(token, actorMessages);
      console.log('Actor response:', actorResponse);
  
      // Генерация вариантов ответов пользователя
      const userResponseMessages = [
        { role: "system", content: `Вы играете роль пользователя, который общается с ${params.actor} в ${params.place} на тему ${params.topic}. Предложите 4 варианта возможных ответов пользователя на последнее сообщение ${params.actor}. Каждый вариант должен начинаться с новой строки и символа "-".` },
        ...messages.map(msg => ({ role: msg.isUser ? "user" : "assistant", content: msg.text })),
        { role: "assistant", content: actorResponse },
        { role: "user", content: "Предложите варианты ответов пользователя." },
      ];
  
      const possibleResponsesText = await makeRequest(token, userResponseMessages);
      console.log('Possible responses text:', possibleResponsesText);
  
      const possibleResponses = possibleResponsesText
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => line.trim().slice(1).trim());
  
      if (possibleResponses.length === 0) {
        possibleResponses.push('Вариант ответа не сгенерирован');
      }
  
      console.log('Processed possible responses:', possibleResponses);
  
      return { 
        response: actorResponse,
        possibleResponses
      };
    } catch (error) {
      console.error('Error generating response:', error);
      return { 
        response: `Извините, произошла ошибка: ${(error as Error).message}`, 
        possibleResponses: ['Ошибка при генерации вариантов ответа'] 
      };
    }
  }
  
  
  
  
  
  
  
  