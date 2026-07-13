import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExperienceForm } from "@/components/cv/content-forms/ExperienceForm";
import { SkillsForm } from "@/components/cv/content-forms/SkillsForm";
import { emptyCvContent } from "@/cv/types";

describe("content forms", () => {
  it("adds an experience entry and commits a field on blur", () => {
    const onChange = vi.fn();
    render(<ExperienceForm content={emptyCvContent()} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add experience/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const patch = onChange.mock.calls[0][0];
    expect(patch.experience).toHaveLength(1);
  });

  it("parses comma-separated skills on commit", () => {
    const onChange = vi.fn();
    const content = { ...emptyCvContent(), skills: [{ id: "g1", name: "Design", skills: [] }] };
    render(<SkillsForm content={content} onChange={onChange} />);
    const input = screen.getByLabelText(/skills \(comma-separated\)/i);
    fireEvent.change(input, { target: { value: "Figma, Prototyping , User research" } });
    fireEvent.blur(input);
    const patch = onChange.mock.calls.at(-1)![0];
    expect(patch.skills[0].skills).toEqual(["Figma", "Prototyping", "User research"]);
  });
});
