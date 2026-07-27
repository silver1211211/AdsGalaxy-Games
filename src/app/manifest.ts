import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ads Galaxy",
    short_name: "Ads Galaxy",
    description: "Premium casual games and rewards.",
    start_url: "/games",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#18a88f",
    orientation: "any",
    icons: []
  };
}
