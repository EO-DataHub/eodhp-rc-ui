import { Item } from "@/types";

const API_URL = import.meta.env.VITE_HUB_BASE_URL;

//This fetch is just illustrative; we are retrieving specific items to validate the behavior.
//The search functionality will change with future tickets.
export const fetchItems = async (): Promise<Item[]> => {
  const response = await fetch(`${API_URL}/api/catalogue/stac/search`, {
    method: "POST",
    headers: {
      "Accept": "application/geo+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      catalog_paths: ["supported-datasets/ceda-stac-catalogue"],
      collections: ["sentinel2_ard"],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch items");
  }

  const data = await response.json()
  return data.features as Item[];
};
