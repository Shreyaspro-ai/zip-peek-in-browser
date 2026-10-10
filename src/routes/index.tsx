import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: "/aquacity/welcome.html" });
  },
  head: () => ({
    meta: [
      { title: "AquaCity — Better water. Better cities." },
      { name: "description", content: "A citizen-powered movement for a water-secure future." },
      { property: "og:title", content: "AquaCity — Better water. Better cities." },
      { property: "og:description", content: "A citizen-powered movement for a water-secure future." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
