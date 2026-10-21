import { NavBar } from "@/components/layout/NavBar";
import { ComingSoonScreen } from "@/screens/home/ComingSoonScreen";

/** Placeholder until the training-plan screens land (spec PR 10). */
export default function PlanPlaceholder() {
  return <ComingSoonScreen title="Plano" header={<NavBar title="Plano de treino" />} />;
}
