import { StaticDecode, Type as T } from "@sinclair/typebox";
import "dotenv/config";
import { StandardValidator } from "typebox-validators";

export const envSchema = T.Object({
  SUPABASE_URL: T.String(),
  SUPABASE_KEY: T.String(),
  UBIQUIBOT_PUBLIC_KEY: T.Optional(T.String()), // optional because it's currently disabled
});

export const envConfigValidator = new StandardValidator(envSchema);

export type Env = StaticDecode<typeof envSchema>;
