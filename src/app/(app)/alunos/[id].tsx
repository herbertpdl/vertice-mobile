import { NavBar } from "@/components/layout/NavBar";
import { ComingSoonScreen } from "@/screens/home/ComingSoonScreen";

/** Placeholder until the student detail lands (spec PR 9). */
export default function StudentDetailPlaceholder() {
  return <ComingSoonScreen title="Aluno" header={<NavBar title="Aluno" />} />;
}
