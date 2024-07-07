// src/services/speechService.ts
import { Message } from '../types/types';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnommatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  }
}

export function startSpeechRecognition(
  onStart: () => void,
  onResult: (text: string) => void,
  onEnd: () => void
): SpeechRecognition | null {
  console.log('Starting speech recognition...');

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    console.error('SpeechRecognition is not supported in this browser');
    return null;
  }

  console.log('SpeechRecognition is supported');
  const recognition = new SpeechRecognitionAPI();
  console.log('Recognition instance created');

  recognition.lang = 'ru-RU';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  console.log('Recognition settings:', {
    lang: recognition.lang,
    interimResults: recognition.interimResults,
    maxAlternatives: recognition.maxAlternatives
  });

  recognition.onstart = () => {
    console.log('Speech recognition started');
    onStart();
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    console.log('Speech recognition result received', event);
    const text = event.results[0][0].transcript;
    console.log('Recognized text:', text);
    onResult(text);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.error('Speech recognition error', event.error);
    console.error('Error details:', event);
  };

  recognition.onend = () => {
    console.log('Speech recognition ended');
    onEnd();
  };

  try {
    console.log('Attempting to start speech recognition');
    recognition.start();
    console.log('Speech recognition started successfully');
  } catch (error) {
    console.error('Error starting speech recognition:', error);
    return null;
  }

  return recognition;
}





export function speakText(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      alert('Ваш браузер не поддерживает синтез речи. Попробуйте Chrome.');
      reject('Speech synthesis not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      reject('Speech synthesis error: ' + event.error);
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function calculateSimilarity(userText: string, possibleResponses: string[]): number {
  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  };

  const userWords = normalizeText(userText).split(' ');

  let maxSimilarity = 0;

  for (const response of possibleResponses) {
    const responseWords = normalizeText(response).split(' ');
    let matchingWords = 0;

    for (const word of userWords) {
      if (responseWords.includes(word)) {
        matchingWords++;
      }
    }

    const similarity = (matchingWords / Math.max(userWords.length, responseWords.length)) * 100;
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  return Math.round(maxSimilarity);
}

export function findMostSimilarResponse(userText: string, possibleResponses: string[]): string {
  let mostSimilarResponse = '';
  let maxSimilarity = 0;

  for (const response of possibleResponses) {
    const similarity = calculateSimilarity(userText, [response]);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarResponse = response;
    }
  }

  return mostSimilarResponse;
}

export async function speakDialogue(messages: Message[]): Promise<void> {
  if (!('speechSynthesis' in window)) {
    alert('Ваш браузер не поддерживает синтез речи. Попробуйте Chrome.');
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  const russianVoice = voices.find(voice => voice.lang === 'en-EN') || voices[0];
  
  for (const message of messages) {
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.voice = russianVoice;
    utterance.pitch = message.isUser ? 1.2 : 0.8; // Разные тональности для пользователя и актера

    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}