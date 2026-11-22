import { describe, expect, it, vi, beforeEach } from "vitest";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { authorizationRedirect, decideAuthorization, loadAuthorization } from "@/lib/oauth-consent";

const api = vi.hoisted(() => ({ getAuthorizationDetails: vi.fn(), approveAuthorization: vi.fn(), denyAuthorization: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { oauth: api } } }));
beforeEach(() => vi.resetAllMocks());
describe("OAuth return path", () => {
  it("preserves the consent ID, query parameters and fragment", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc&x=1#consent")).toBe("/.lovable/oauth/consent?authorization_id=abc&x=1#consent");
  });
  it.each(["//outside.invalid", "/\\outside.invalid/", "https://outside.invalid", "/foo\nbar", "", undefined])("rejects unsafe paths %s", value => {
    expect(oauthReturnPath(value)).toBe("/");
  });
});
describe("Consent decisions", () => {
  it("approves through the SDK and returns the provider destination", async () => {
    api.approveAuthorization.mockResolvedValue({ data: { redirect_url: "https://client.invalid/callback?code=abc" }, error: null });
    expect(await decideAuthorization("abc", true)).toBe("https://client.invalid/callback?code=abc");
    expect(api.approveAuthorization).toHaveBeenCalledWith("abc");
    expect(api.denyAuthorization).not.toHaveBeenCalled();
  });
  it("denies through the SDK and returns its destination", async () => {
    api.denyAuthorization.mockResolvedValue({ data: { redirect_to: "https://client.invalid/callback?error=access_denied" }, error: null });
    expect(await decideAuthorization("abc", false)).toContain("access_denied");
    expect(api.denyAuthorization).toHaveBeenCalledWith("abc");
  });
  it.each([true, false])("surfaces failed decision %s", async approve => {
    (approve ? api.approveAuthorization : api.denyAuthorization).mockResolvedValue({ data: null, error: { message: "provider error" } });
    await expect(decideAuthorization("abc", approve)).rejects.toThrow("Não foi possível");
  });
  it("handles missing authorization IDs without calling the provider", async () => {
    await expect(loadAuthorization("")).rejects.toThrow("incompleto");
    expect(api.getAuthorizationDetails).not.toHaveBeenCalled();
  });
  it("handles expired IDs and provider lookup failures", async () => {
    api.getAuthorizationDetails.mockResolvedValue({ data: null, error: { message: "expired" } });
    await expect(loadAuthorization("expired")).rejects.toThrow("expirou");
  });
  it("follows already-authorized redirects without displaying a new consent", () => {
    expect(authorizationRedirect({ redirect_url: "https://client.invalid/callback" })).toBe("https://client.invalid/callback");
    expect(authorizationRedirect({ client: { name: "Client" }, redirect_url: "https://client.invalid/callback" })).toBeUndefined();
  });
});