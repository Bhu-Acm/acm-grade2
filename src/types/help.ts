export interface HelpPost {
  id: string;
  round: number;
  category: string;
  question: string;
  answer: string;
  steps?: string[];
  code?: string;
  tips?: string[];
}

export interface HelpResource {
  id: string;
  title: string;
  description: string;
  path: string;
  type: 'PDF' | 'TEXT';
}
