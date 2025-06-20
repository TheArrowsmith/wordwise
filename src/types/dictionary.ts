// Dictionary API types
export interface DictionaryRequest {
  word: string;
  nativeLanguage: string;
}

export interface DictionaryDefinition {
  partOfSpeech: string;
  definition: string;
}

export interface DictionaryResponse {
  wordFound: boolean;
  definitions: DictionaryDefinition[];
  translations: string[];
}

export interface DictionaryError {
  error: string;
  message?: string;
} 