// src/services/speechService.ts

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
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
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}


export function startSpeechRecognition(
  onResult: (text: string) => void,
  onEnd: () => void
): SpeechRecognition | null {
  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionConstructor) {
    console.error('SpeechRecognition is not supported in this browser');
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.lang = 'ru-RU';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const text = event.results[0][0].transcript;
    console.log('Recognized text:', text);
    onResult(text);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.error('Speech recognition error', event.error);
    onEnd();
  };

  recognition.onend = () => {
    console.log('Speech recognition ended');
    onEnd();
  };

  recognition.start();
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