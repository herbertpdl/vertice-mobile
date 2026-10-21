import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * "Exportar meus dados": writes the BFF's JSON to the app's cache under the name it chose and
 * opens the share sheet (save to Files / Drive, AirDrop, mail). The file stays in the cache, which
 * the OS may clear; it never goes anywhere the user didn't pick.
 */
export async function shareExport({ text, filename }: { text: string; filename: string }): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Exportar meus dados", UTI: "public.json" });
}
