import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = "it"; // Default fallback — will be overridden by middleware or cookie

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});