import { EmitterWebhookEvent as WebhookEvent, EmitterWebhookEventName as WebhookEventName } from "@octokit/webhooks";
import { StandardValidator } from "typebox-validators";
import { SupportedEvents } from "./context";
import { StaticDecode, Type as T } from "@sinclair/typebox";

export interface PluginInputs<T extends WebhookEventName = SupportedEvents> {
  stateId: string;
  eventName: T;
  eventPayload: WebhookEvent<T>["payload"];
  settings: AssistivePricingSettings;
  authToken: string;
  ref: string;
}

export const pluginSettingsSchema = T.Object(
  {
    globalConfigUpdate: T.Optional(
      T.Object({
        excludeRepos: T.Array(T.String()),
      })
    ),
    labels: T.Object(
      {
        time: T.Array(
          T.Object({
            name: T.String(),
            collaboratorOnly: T.Boolean({ default: false }),
          }),
          { default: [] }
        ),
        priority: T.Array(
          T.Object({
            name: T.String(),
            collaboratorOnly: T.Boolean({ default: false }),
          }),
          { default: [] }
        ),
      },
      { default: {} }
    ),
    basePriceMultiplier: T.Number({ default: 1 }),
    publicAccessControl: T.Object(
      {
        setLabel: T.Boolean({ default: false }),
        fundExternalClosedIssue: T.Boolean({ default: false }),
      },
      { default: {} }
    ),
  },
  { default: {} }
);

export const assistivePricingSchemaValidator = new StandardValidator(pluginSettingsSchema);

export type AssistivePricingSettings = StaticDecode<typeof pluginSettingsSchema>;

export type Rates = {
  previousBaseRate: number | null;
  newBaseRate: number | null;
};

export const COLLABORATOR_ONLY_DESCRIPTION = "⚠️ Collaborator only";
