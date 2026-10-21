import * as WebBrowser from "expo-web-browser";

import { env } from "@/lib/env";

export type LegalPage = "termos" | "privacidade";

export const LEGAL_PAGE_TITLES: Record<LegalPage, string> = {
  termos: "Termos de uso",
  privacidade: "Política de privacidade",
};

/**
 * Opens a legal text in the in-app browser (SFSafariViewController / Custom Tabs). The app ships
 * no copy of the texts: the web's pages are the single source, and `GET /api/legal/versions`
 * says which version is current (spec §2, "Consent").
 */
export async function openLegalPage(page: LegalPage): Promise<void> {
  await WebBrowser.openBrowserAsync(`${env.EXPO_PUBLIC_WEB_URL}/${page}`);
}
