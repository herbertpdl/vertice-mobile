import { fireEvent, render, screen } from "@testing-library/react-native";

import type { EnrichedFeedback } from "@/lib/api/types";

import { FeedbackRow } from "./FeedbackRow";

const feedback: EnrichedFeedback = {
  id: 1,
  workoutLogId: 1,
  workoutId: 1,
  trainingPlanId: 1,
  clientId: 7,
  text: "Consegui subir 2,5 kg no supino!",
  rating: null,
  replaced: false,
  createdAt: "2026-10-01T10:00:00Z",
  clientName: "Rafael Lima",
  workoutName: "Treino A — Peito e Tríceps",
  trainingPlanName: "Base de força",
};

describe("FeedbackRow", () => {
  it("reads as one sentence and is static without onPress", async () => {
    await render(<FeedbackRow feedback={feedback} />);
    expect(screen.getByLabelText(/^Rafael Lima, .*Treino A — Peito e Tríceps · Base de força: Consegui subir/)).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is a button when it opens the student", async () => {
    const onPress = jest.fn();
    await render(<FeedbackRow feedback={feedback} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalled();
  });

  it("shows the client's rating, and no chip on feedback from before ratings (R71)", async () => {
    const { rerender } = await render(<FeedbackRow feedback={{ ...feedback, rating: "HARD" }} />);
    expect(screen.getByLabelText("Avaliação: Difícil")).toBeOnTheScreen();
    expect(screen.getByLabelText(/Avaliação: Difícil\.$/)).toBeOnTheScreen();
    await rerender(<FeedbackRow feedback={feedback} />);
    expect(screen.queryByLabelText("Avaliação: Difícil")).toBeNull();
  });

  it("says when the client only rated, and when a redo replaced the session (R72, R24)", async () => {
    await render(<FeedbackRow feedback={{ ...feedback, text: "", rating: "EASY", replaced: true }} />);
    expect(screen.getByText("Sem comentário")).toBeOnTheScreen();
    expect(screen.getByText("Sessão substituída")).toBeOnTheScreen();
  });
});
