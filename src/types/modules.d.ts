declare module 'nspell' {
  interface SpellChecker {
    correct(word: string): boolean;
    suggest(word: string): string[];
  }
  
  function nspell(dictionary: { aff: Buffer; dic: Buffer }): SpellChecker;
  export = nspell;
}

declare module 'dictionary-en-us' {
  interface Dictionary {
    aff: Buffer;
    dic: Buffer;
  }
  
  function dictionary(callback: (err: Error | null, result?: Dictionary) => void): void;
  export = dictionary;
} 