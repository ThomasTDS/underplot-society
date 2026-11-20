// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));
const { POST } = await import("./route");

const SECRET = "s".repeat(40);

function post(body: unknown, headers: Record<string, string> = { authorization: `Bearer ${SECRET}` }) {
  return POST(new Request("http://127.0.0.1:3000/internal/revalidate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }));
}

beforeEach(() => vi.stubEnv("REVALIDATE_SECRET", SECRET));
afterEach(() => {
  vi.unstubAllEnvs();
  revalidateTag.mockReset();
});

describe("POST /internal/revalidate", () => {
  it("drops each known tag at once", async () => {
    const response = await post({ tags: ["articles:en", "article:en:hello", "articles:en"] });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revalidated: ["articles:en", "article:en:hello"] });
    expect(revalidateTag.mock.calls).toEqual([
      ["articles:en", { expire: 0 }],
      ["article:en:hello", { expire: 0 }],
    ]);
  });

  it.each([
    ["no secret", {}],
    ["a wrong secret", { authorization: `Bearer ${"x".repeat(40)}` }],
    ["a request from the internet", { authorization: `Bearer ${SECRET}`, "cf-connecting-ip": "203.0.113.9" }],
  ])("answers 404 to %s and drops nothing", async (_, headers) => {
    const response = await post({ tags: ["content"] }, headers);
    expect(response.status).toBe(404);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each(["", "short"])("is off while the server secret is %j (missing or too short)", async (secret) => {
    vi.stubEnv("REVALIDATE_SECRET", secret);
    const response = await post({ tags: ["content"] }, { authorization: `Bearer ${secret}` });
    expect(response.status).toBe(404);
  });

  it.each([
    ["not JSON", "{", 400],
    ["no tags", {}, 422],
    ["an empty list", { tags: [] }, 422],
    ["an unknown tag", { tags: ["content", "users"] }, 422],
    ["too many tags", { tags: Array.from({ length: 101 }, () => "content") }, 422],
  ])("refuses %s", async (_, body, status) => {
    const response = await post(body);
    expect(response.status).toBe(status);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
