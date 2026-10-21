import { NavBar } from "@/components/layout/NavBar";
import { ComingSoonScreen } from "@/screens/home/ComingSoonScreen";

/** Placeholder until the workout editor lands (spec PR 11). */
export default function WorkoutPlaceholder() {
  return <ComingSoonScreen title="Treino" header={<NavBar title="Editar treino" />} />;
}
