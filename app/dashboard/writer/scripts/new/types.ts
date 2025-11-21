export type CharacterInput = {
  id: string;
  name: string;
  role: string;
  genders: string[];
  races: string[];
  startAge: number | null;
  endAge: number | null;
  anyAge: boolean;
  description: string;
};
