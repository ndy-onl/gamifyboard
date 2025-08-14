import { atom } from "jotai";

export interface AuthState {
  user: {
    id: number;
    email: string;
  } | null;
  accessToken: string | null;
}

export const authAtom = atom<AuthState>({ user: null, accessToken: null });
