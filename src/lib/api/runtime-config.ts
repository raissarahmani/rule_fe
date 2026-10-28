let apiBaseUrlPromise: Promise<string> | undefined;

export function getApiBaseUrl(): Promise<string> {
  if (!apiBaseUrlPromise) {
    apiBaseUrlPromise = loadApiBaseUrl().catch((error) => {
      // Retry on the next request if configuration was temporarily unavailable.
      apiBaseUrlPromise = undefined;
      throw error;
    });
  }

  return apiBaseUrlPromise;
}

async function loadApiBaseUrl(): Promise<string> {
  const response = await fetch("/rule/runtime-config", { cache: "no-store" });
  const config = await response.json();

  if (!response.ok) {
    throw new Error(config.error || "Unable to load the API configuration.");
  }

  if (typeof config.apiBaseUrl !== "string" || !config.apiBaseUrl) {
    throw new Error("The runtime API configuration is missing apiBaseUrl.");
  }

  return config.apiBaseUrl;
}
