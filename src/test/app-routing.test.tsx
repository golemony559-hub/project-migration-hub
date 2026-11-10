import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the creator studio and guide detail routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/explore").at(-1)?.routeId).toBe("/explore");
    expect(router.matchRoutes("/creator").at(-1)?.routeId).toBe("/creator");
    expect(router.matchRoutes("/policies").at(-1)?.routeId).toBe("/policies");
    expect(router.matchRoutes("/terms").at(-1)?.routeId).toBe("/terms");
    expect(router.matchRoutes("/privacy").at(-1)?.routeId).toBe("/privacy");
    expect(router.matchRoutes("/creator-rules").at(-1)?.routeId).toBe("/creator-rules");
    expect(router.matchRoutes("/reset-password").at(-1)?.routeId).toBe("/reset-password");
    expect(router.matchRoutes("/guide/healthy-chicks-first-eight-weeks").at(-1)?.routeId).toBe(
      "/guide/$slug",
    );
  });
});
