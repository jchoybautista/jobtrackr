import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColumnMenu } from "@/components/board/ColumnMenu";
import { useApp } from "@/lib/store";
import type { Stage } from "@/lib/types";
import { beforeEach, it, expect } from "vitest";

const stage = (o: Partial<Stage>): Stage =>
  ({ id: "s", name: "Screening", color: "sky", order: 1, kind: "pipeline", ...o });

beforeEach(() => {
  useApp.setState({ applications: [], stages: [], ready: true });
});

it("hides Rename for default (role) stages", async () => {
  render(<ColumnMenu stage={stage({ role: "screening" })} />);
  await userEvent.click(screen.getByLabelText("Screening column menu"));
  expect(screen.queryByText("Rename")).toBeNull();
  expect(screen.getByText("Delete")).toBeTruthy();
});

it("hides Delete for pinned stages", async () => {
  render(<ColumnMenu stage={stage({ name: "Saved", pinned: true, kind: "pipeline" })} />);
  await userEvent.click(screen.getByLabelText("Saved column menu"));
  expect(screen.queryByText("Delete")).toBeNull();
  expect(screen.getByText("Rename")).toBeTruthy();
});

it("renders no menu trigger when a stage is both locked and pinned", () => {
  render(<ColumnMenu stage={stage({ name: "Offer", role: "offer", pinned: true, kind: "won" })} />);
  expect(screen.queryByLabelText(/column menu/i)).toBeNull();
});
