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

export async function generateResponse(token: string, messages: Message[], params: DialogueParams): Promise<{ response: string, possibleResponses: string[] }> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: `Вы играете роль ${params.actor} в ${params.place} и ведете диалог на тему ${params.topic}. Отвечайте кратко, в пределах 2-3 предложений. После вашего ответа предложите 4 варианта возможных ответов пользователя, начиная каждый с новой строки и символа -.` },
            ...messages.map(msg => ({ role: msg.isUser ? "user" : "assistant", content: msg.text })),
          ],
          max_tokens: 300
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
  
      console.log('Raw ChatGPT response:', content);
  
      const parts = content.split('\n\n');
      const actorResponse = parts[0] || 'Не удалось получить ответ';
      const possibleResponsesText = parts[1] || '';
  
      const possibleResponses = possibleResponsesText
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => line.slice(1).trim());
  
      return { 
        response: actorResponse.trim(), 
        possibleResponses: possibleResponses.length ? possibleResponses : ['Вариант ответа не сгенерирован'] 
      };
    } catch (error) {
      console.error('Error generating response:', error);
      return { 
        response: `Извините, произошла ошибка: ${(error as Error).message}`, 
        possibleResponses: ['Ошибка при генерации вариантов ответа'] 
      };
    }
  }
  
  