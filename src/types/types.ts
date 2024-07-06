// src/types/types.ts

export interface Settings {
    chatGPTToken: string;
    googleVoiceToken: string;
  }
  
  export interface TokenStatus {
    isChecking: boolean;
    isValid: boolean;
    message: string;
  }
  
  export interface Message {
    text: string;
    isUser: boolean;
  }
  
  export interface DialogueParams {
    place: string;
    topic: string;
    actor: string;
  }