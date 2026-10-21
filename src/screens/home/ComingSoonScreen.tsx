import { Construction } from "lucide-react-native";
import type { ReactNode } from "react";

import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/ui";

/** A tab whose screens land in a later PR of the spec (PR 8 Alunos, PR 12 Exercícios, PR 13 Perfil). */
export function ComingSoonScreen({ title, header }: { title: string; header?: ReactNode }) {
  return (
    <Screen inTabs={header === undefined} header={header}>
      <EmptyState icon={Construction} title={title} message="Esta seção chega em breve." />
    </Screen>
  );
}
