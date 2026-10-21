import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pencil, UserX } from "lucide-react-native";
import { Platform } from "react-native";

import { ActionSheet } from "./ActionSheet";

function renderSheet(onClose: () => void, onEnd: () => void) {
  return render(
    <ActionSheet
      visible
      onClose={onClose}
      title="Marina Costa"
      actions={[
        { icon: Pencil, label: "Editar aluno", onPress: () => {} },
        { icon: UserX, label: "Encerrar vínculo", onPress: onEnd, danger: true },
      ]}
    />,
  );
}

/** The `onDismiss` the sheet gave its `Modal` (UIKit calls it once the sheet is gone). */
function modalOnDismiss(): (() => void) | undefined {
  const tree = screen.toJSON();
  const nodes = Array.isArray(tree) ? tree : [tree];
  return nodes.find((node) => node?.props?.onDismiss)?.props.onDismiss;
}

describe("ActionSheet", () => {
  afterEach(() => jest.restoreAllMocks());

  it("iOS: closes, and runs the action only once the sheet has dismissed", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    const onClose = jest.fn();
    const onEnd = jest.fn();
    await renderSheet(onClose, onEnd);
    await fireEvent.press(screen.getByRole("button", { name: "Encerrar vínculo" }));
    expect(onClose).toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    const onDismiss = modalOnDismiss();
    expect(onDismiss).toBeDefined();
    onDismiss?.();
    onDismiss?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("Android: closes and runs the action right away", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const onClose = jest.fn();
    const onEnd = jest.fn();
    await renderSheet(onClose, onEnd);
    await fireEvent.press(screen.getByRole("button", { name: "Encerrar vínculo" }));
    expect(onClose).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("cancels", async () => {
    const onClose = jest.fn();
    await render(<ActionSheet visible onClose={onClose} title="Plano" actions={[]} />);
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
