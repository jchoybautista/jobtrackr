import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddColumn } from "@/components/board/AddColumn";
import { useApp } from "@/lib/store";
import { beforeEach, it, expect, vi } from "vitest";

beforeEach(() => {
  useApp.setState({ stages: [], applications: [], ready: true });
});

it("adds a column via the inline input", async () => {
  const addStage = vi.fn().mockResolvedValue(undefined);
  useApp.setState({ addStage } as never);
  render(<AddColumn />);
  await userEvent.click(screen.getByRole("button", { name: /add column/i }));
  await userEvent.type(screen.getByLabelText("New column name"), "Take-home");
  await userEvent.keyboard("{Enter}");
  expect(addStage).toHaveBeenCalledWith("Take-home");
});
