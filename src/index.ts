import * as github from "@actions/github";
import * as core from "@actions/core";
import { Value } from "@sinclair/typebox/value";
import { envSchema } from "./types/env";
import { assistivePricingSettingsSchema, PluginInputs } from "./types/plugin-input";
import { run } from "./run";

/**
 * Run the plugin as a GitHub Action instance.
 */
async function actionRun() {
  const payloadEnv = {
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    UBIQUIBOT_PUBLIC_KEY: process.env.UBIQUIBOT_PUBLIC_KEY || "temporarily-disabled",
  };

  const env = Value.Decode(envSchema, payloadEnv);

  const webhookPayload = github.context.payload.inputs;
  const settings = Value.Decode(assistivePricingSettingsSchema, Value.Default(assistivePricingSettingsSchema, JSON.parse(webhookPayload.settings)));

  const inputs: PluginInputs = {
    stateId: webhookPayload.stateId,
    eventName: webhookPayload.eventName,
    eventPayload: JSON.parse(webhookPayload.eventPayload),
    settings: settings,
    authToken: webhookPayload.authToken,
    ref: webhookPayload.ref,
  };
  await run(inputs, env);
}

actionRun()
  .then((result) => core.setOutput("result", result))
  .catch((error) => {
    console.error(error);
    core.setFailed(error);
  });
