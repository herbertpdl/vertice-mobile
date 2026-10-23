import { AtSign, Mail, MessageCircle, type LucideIcon } from "lucide-react-native";
import { Linking, StyleSheet, View } from "react-native";

import { Avatar, ListRow, Text, useToast } from "@/components/ui";
import type { ClientTrainer } from "@/lib/api/types";
import { maskPhone } from "@/lib/masks/phone";
import { colors, radius, sizes, space } from "@/theme";

export type TrainerContactCardProps = { trainer: ClientTrainer };

type Contact = { key: string; icon: LucideIcon; label: string; url: string };

/**
 * The contacts the trainer shows, each a link out: e-mail, WhatsApp (Brazilian numbers, so `55`
 * goes in front of the area code) and Instagram. Blank ones (not shown) are left out.
 */
export function trainerContacts({ email, whatsapp, instagram }: ClientTrainer): Contact[] {
  const contacts: Contact[] = [];
  if (email !== "") contacts.push({ key: "email", icon: Mail, label: email, url: `mailto:${email}` });
  if (whatsapp !== "") {
    contacts.push({ key: "whatsapp", icon: MessageCircle, label: `WhatsApp · ${maskPhone(whatsapp)}`, url: `https://wa.me/55${whatsapp}` });
  }
  if (instagram !== "") {
    contacts.push({ key: "instagram", icon: AtSign, label: `@${instagram}`, url: `https://instagram.com/${encodeURIComponent(instagram)}` });
  }
  return contacts;
}

/**
 * A - Perfil's "Seu treinador" card (PRD R74–R76): the trainer's name always, then the contacts
 * they chose to show, opening the mail app, WhatsApp or Instagram.
 */
export function TrainerContactCard({ trainer }: TrainerContactCardProps) {
  const toast = useToast();
  const contacts = trainerContacts(trainer);
  const open = (url: string) =>
    void Linking.openURL(url).catch(() => toast.show("Não foi possível abrir o contato.", "error"));
  return (
    <View style={styles.card}>
      <View style={[styles.head, contacts.length > 0 ? styles.rule : null]}>
        <Avatar name={trainer.name} size={40} />
        <View style={styles.lines}>
          <Text variant="bodyLgStrong" numberOfLines={2}>
            {trainer.name}
          </Text>
          <Text variant="small" color="textSecondary">
            Personal trainer
          </Text>
        </View>
      </View>
      {contacts.map((contact, index) => (
        <ListRow
          key={contact.key}
          icon={contact.icon}
          label={contact.label}
          role="link"
          last={index === contacts.length - 1}
          onPress={() => open(contact.url)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  head: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: sizes.trainerCardPaddingVertical, paddingHorizontal: space[4] },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.border },
  lines: { flex: 1, gap: sizes.rowLinesGapTight },
});
