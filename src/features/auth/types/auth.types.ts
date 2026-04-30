export type LoginResult =
  | { ok: true }
  | { ok: false; message: string };

export type LoginResponse = {
  ok: boolean;
  token: string;
};

export type AuthCredentials = {
  username: string;
  password: string;
};