import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { drop } from "@mswjs/data";
import commandParser, { CommandArguments } from "../src/handlers/command-parser";
import { Env } from "../src/types/env";
import workerFetch from "../src/worker";
import { db } from "./__mocks__/db";
import { server } from "./__mocks__/node";
import issueCommented from "./__mocks__/requests/issue-comment-post.json";
import usersGet from "./__mocks__/users-get.json";
import * as crypto from "crypto";
import { AssistivePricingSettings, assistivePricingSettingsSchema } from "../src/types/plugin-input";
import { Value } from "@sinclair/typebox/value";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: jest.fn(),
  };
});

describe("User tests", () => {
  beforeEach(() => {
    drop(db);
    for (const item of usersGet) {
      db.users.create(item);
    }
  });

  it("Should not include globalConfigUpdate in defaults if omitted", () => {
    const settings = Value.Default(assistivePricingSettingsSchema, {}) as AssistivePricingSettings;
    const decodedSettings = Value.Decode(assistivePricingSettingsSchema, settings);
    expect(decodedSettings.globalConfigUpdate).toBeUndefined();
  });

  it("Should parse the /allow command", () => {
    const command = "/allow @user time priority".split(/\s+/);
    const invalidCommand = "allow user time priority".split(/\s+/);
    const unknownCommand = "/foo user time priority".split(/\s+/);
    const commandForRemoval = "/allow @user".split(/\s+/);
    const result: CommandArguments = {
      command: "allow",
      labels: [],
      username: "",
    };
    commandParser
      .action((command, username, labels) => {
        result.command = command;
        result.username = username;
        result.labels = labels;
      })
      .parse(command, { from: "user" });
    expect(result).toEqual({
      command: "allow",
      labels: ["time", "priority"],
      username: "user",
    });
    expect(() => commandParser.exitOverride().parse(invalidCommand, { from: "user" })).toThrow();
    expect(() => commandParser.exitOverride().parse(unknownCommand, { from: "user" })).toThrow();
    commandParser
      .action((command, username, labels) => {
        result.command = command;
        result.username = username;
        result.labels = labels;
      })
      .parse(commandForRemoval, { from: "user" });
    expect(result).toEqual({
      command: "allow",
      labels: [],
      username: "user",
    });
  });

  it("Should handle the comment", async () => {
    const data = {
      ...issueCommented,
      authToken: process.env.GITHUB_TOKEN,
    };
    const sign = crypto.createSign("SHA256");
    sign.update(JSON.stringify(data));
    sign.end();
    const signature = sign.sign(privateKey, "base64");

    const result = await workerFetch.fetch(
      {
        headers: {
          get: () => "application/json",
        },
        json: () => ({
          ...data,
          signature,
        }),
        method: "POST",
      } as unknown as Request,
      {
        SUPABASE_URL: "url",
        SUPABASE_KEY: "key",
        UBIQUIBOT_PUBLIC_KEY: publicKey,
      }
    );
    expect(result.ok).toEqual(true);
  });

  it("Should deny non POST request", async () => {
    const result = await workerFetch.fetch(
      {
        method: "GET",
        url: "https://example.com",
      } as Request,
      {
        SUPABASE_URL: "url",
        SUPABASE_KEY: "key",
        UBIQUIBOT_PUBLIC_KEY: "key",
      }
    );
    expect(result.ok).toEqual(false);
    expect(result.status).toEqual(405);
  });

  it("Should reject an invalid environment", async () => {
    const result = await workerFetch.fetch(
      {
        method: "POST",
        headers: {
          get: () => "application/json",
        },
      } as unknown as Request,
      {
        SUPABASE_URL: "url",
        SUPABASE_KEY: "key",
      } as unknown as Env
    );
    expect(result.ok).toEqual(false);
    expect(result.status).toEqual(500);
    // expect(await result.json()).toEqual({
    //   error: "Bad Request: the environment is invalid. /UBIQUIBOT_PUBLIC_KEY: Required property; /UBIQUIBOT_PUBLIC_KEY: Expected string",
    // });
  });
});
