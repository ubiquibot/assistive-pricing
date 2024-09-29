import { EmitterWebhookEvent as WebhookEvent, EmitterWebhookEventName as WebhookEventName } from "@octokit/webhooks";
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

export const assistivePricingSettingsSchema = T.Object({
  globalConfigUpdate: T.Optional(
    T.Object({
      excludeRepos: T.Array(T.String()),
    })
  ),
  labels: T.Object(
    {
      time: T.Array(T.String(), { default: [] }),
      priority: T.Array(T.String(), { default: [] }),
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
});

export type AssistivePricingSettings = StaticDecode<typeof assistivePricingSettingsSchema>;

export type Rates = {
  previousBaseRate: number | null;
  newBaseRate: number | null;
};
