import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PreviewImage } from "./preview-image";

afterEach(cleanup);

it("图片请求失败给出可理解反馈，替换来源后重新尝试显示", () => {
  const view = render(<PreviewImage src="/missing.png" alt="素材预览" width={100} height={100} unoptimized />);
  fireEvent.error(screen.getByAltText("素材预览"));
  expect(screen.getByRole("img", { name: "素材预览，图片暂时无法加载" })).toBeInTheDocument();
  expect(screen.getByText("请刷新页面或稍后查看")).toBeInTheDocument();
  view.rerender(<PreviewImage src="/replacement.png" alt="素材预览" width={100} height={100} unoptimized />);
  expect(screen.getByAltText("素材预览")).toBeInTheDocument();
  expect(screen.queryByText("图片暂时无法加载")).not.toBeInTheDocument();
});
