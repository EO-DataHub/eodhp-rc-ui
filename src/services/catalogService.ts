const API_URL = import.meta.env.VITE_HUB_BASE_URL;

export const fetchCatalogs = async () => {
  const response = await fetch(`${API_URL}/api/catalogue/stac/catalogs`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) throw new Error();

  return response.json();
};
