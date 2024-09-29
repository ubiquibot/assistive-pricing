import { Octokit } from "@octokit/rest";
import { createClient } from "@supabase/supabase-js";
import { createAdapters } from "./adapters";
import { handleComment } from "./handlers/comment";
import { watchLabelChange } from "./handlers/label-change";
import { onLabelChangeSetPricing } from "./handlers/pricing-label";
import { syncPriceLabelsToConfig } from "./handlers/sync-labels-to-config";
import { Context } from "./types/context";
import { Env } from "./types/env";
import { PluginInputs } from "./types/plugin-input";
import { globalLabelUpdate } from "./handlers/global-config-update";
import { isIssueLabelEvent } from "./types/typeguards";
import { Logs } from "@ubiquity-dao/ubiquibot-logger";

export async function run(inputs: PluginInputs, env: Env) {
  const octokit = new Octokit({ auth: inputs.authToken });
  const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    logger: new Logs("info"),
    adapters: {} as ReturnType<typeof createAdapters>,
    env,
  };
  context.adapters = createAdapters(supabaseClient, context);

  const eventName = inputs.eventName;
  switch (eventName) {
    case "issues.labeled":
    case "issues.unlabeled":
      if (isIssueLabelEvent(context)) {
        await syncPriceLabelsToConfig(context);
        await onLabelChangeSetPricing(context);
      }
      break;
    case "label.edited":
      await watchLabelChange(context);
      break;
    case "issue_comment.created":
      await handleComment(context);
      break;
    case "push":
      await globalLabelUpdate(context);
      break;
    default:
      context.logger.error(`Event ${eventName} is not supported`);
  }
}
