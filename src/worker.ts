import { Value } from "@sinclair/typebox/value";
import { run } from "./run";
import { Env, envConfigValidator } from "./types/env";
import { assistivePricingSettingsSchema } from "./types/plugin-input";
import manifest from "../manifest.json";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === "GET") {
        const url = new URL(request.url);
        if (url.pathname === "/manifest.json") {
          return new Response(JSON.stringify(manifest), {
            headers: { "content-type": "application/json" },
          });
        }
      }
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: `Only POST requests are supported.` }), {
          status: 405,
          headers: { "content-type": "application/json", Allow: "POST" },
        });
      }
      const contentType = request.headers.get("content-type");
      if (contentType !== "application/json") {
        return new Response(JSON.stringify({ error: `Bad request: ${contentType} is not a valid content type` }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      if (!envConfigValidator.test(env)) {
        const errorDetails: string[] = [];
        for (const error of envConfigValidator.errors(env)) {
          errorDetails.push(`${error.path}: ${error.message}`);
        }
        return new Response(JSON.stringify({ error: `Bad Request: the environment is invalid. ${errorDetails.join("; ")}` }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      const webhookPayload = await request.json();
      // TODO: temporarily disabled, should be added back with the proper key in the configuration.
      // const signature = webhookPayload.signature;
      // delete webhookPayload.signature;
      // if (!(await verifySignature(env.UBIQUIBOT_PUBLIC_KEY, webhookPayload, signature))) {
      //   return new Response(JSON.stringify({ error: `Forbidden: Signature verification failed` }), {
      //     status: 403,
      //     headers: { "content-type": "application/json" },
      //   });
      // }
      webhookPayload.settings = Value.Decode(assistivePricingSettingsSchema, Value.Default(assistivePricingSettingsSchema, webhookPayload.settings));
      await run(webhookPayload, env);
      return new Response(JSON.stringify("OK"), { status: 200, headers: { "content-type": "application/json" } });
    } catch (error) {
      return handleUncaughtError(error);
    }
  },
};

function handleUncaughtError(error: unknown) {
  console.error(error);
  const status = 500;
  return new Response(JSON.stringify({ error }), { status: status, headers: { "content-type": "application/json" } });
}

// async function verifySignature(publicKeyPem: string, payload: unknown, signature: string) {
//   const pemContents = publicKeyPem.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").trim();
//   const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

//   const publicKey = await crypto.subtle.importKey(
//     "spki",
//     binaryDer.buffer,
//     {
//       name: "RSASSA-PKCS1-v1_5",
//       hash: "SHA-256",
//     },
//     true,
//     ["verify"]
//   );

//   const signatureArray = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
//   const dataArray = new TextEncoder().encode(JSON.stringify(payload));

//   return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signatureArray, dataArray);
// }
