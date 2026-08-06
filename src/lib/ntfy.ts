const TOPIC = "miniPKtooter";

/**
 * Publish a push notification to Ayush's ntfy topic.
 *
 * Uses ntfy's JSON endpoint rather than its header-based API. The old page put
 * emoji in a `Title` header, which throws before the request is sent because
 * header values must be ISO-8859-1; its replacement used `mode:"no-cors"`,
 * whose opaque response can never report failure, so every send "succeeded".
 * JSON carries the title in the body and comes back with real CORS headers, so
 * the boolean returned here actually means something.
 */
export async function publish(message: string, title = "💚 from Anwi"): Promise<boolean> {
  try {
    const response = await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: TOPIC, message, title, tags: ["green_heart"] }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
