import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/**
 * The exported file holds the account's personal data in full (CPF included), so it only lives in
 * this folder of the app's cache, and only until the next export, a sign-out (`clearExports`) or —
 * on iOS — the share sheet closing.
 */
function exportsDir() {
  return new Directory(Paths.cache, "exports");
}

/** Deletes every exported file left on the device. Best effort: never throws. */
export function clearExports() {
  try {
    const dir = exportsDir();
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to clean, or the OS already did.
  }
}

/**
 * "Exportar meus dados": writes the BFF's JSON under the name it chose and opens the share sheet
 * (save to Files / Drive, AirDrop, mail) — it never goes anywhere the user didn't pick.
 */
export async function shareExport({ text, filename }: { text: string; filename: string }): Promise<void> {
  clearExports();
  const dir = exportsDir();
  dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, filename);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Exportar meus dados", UTI: "public.json" });
  // iOS resolves once the sheet is gone (the target has the file); Android may resolve before the
  // target app read it, so there the next export or the sign-out cleans up.
  if (Platform.OS === "ios") clearExports();
}
