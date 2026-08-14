import { type CSSProperties, type ReactNode } from "react";
import type { ToastItem, ToastPosition } from "../types/toast";
import { ToastIcon } from "./icons";

export interface ToastBarProps {
  readonly toast: ToastItem;
  readonly position?: ToastPosition;
  readonly style?: CSSProperties;
  readonly children?: (components: { icon: ReactNode; message: ReactNode }) => ReactNode;
}

const getMotionStyle = (toast: ToastItem, position: ToastPosition): CSSProperties => {
  const isClosing = toast.status === "closing";
  const isCenter = position.endsWith("center");

  const enterAnimation = `toast-enter 220ms cubic-bezier(0.21, 1.02, 0.73, 1) forwards`;
  const exitAnimation = `toast-exit 180ms cubic-bezier(0.06, 0.71, 0.55, 1) forwards`;

  return {
    animation: isClosing ? exitAnimation : enterAnimation,
    "--toast-enter-y": position.startsWith("top") ? "-14px" : "14px",
    "--toast-exit-y": position.startsWith("top") ? "-10px" : "10px",
    "--toast-enter-x": isCenter ? "0px" : position.endsWith("left") ? "-18px" : "18px",
    "--toast-exit-x": isCenter ? "0px" : position.endsWith("left") ? "-14px" : "14px",
  } as CSSProperties;
};

export const ToastBar = ({ toast, position, style, children }: ToastBarProps) => {
  const isCustom = toast.type === "custom";

  const defaultStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    color: "#363636",
    lineHeight: 1.3,
    willChange: "transform, opacity",
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)",
    width: "fit-content",
    maxWidth: 350,
    pointerEvents: "auto",
    padding: "10px 12px",
    borderRadius: 8,
    transition: "box-shadow 180ms ease, background-color 180ms ease, color 180ms ease",
    ...getMotionStyle(toast, position ?? toast.position ?? "top-center"),
    ...toast.style,
    ...style,
  };

  const icon = <ToastIcon type={toast.type} icon={toast.icon} iconTheme={toast.iconTheme} />;
  const message = (
    <div style={{ display: "flex", alignItems: "center", margin: "2px 4px 2px 8px", color: "inherit", flex: 1 }}>
      {toast.message}
    </div>
  );

  return (
    <div
      className={toast.className}
      style={defaultStyle}
      role={toast.ariaProps.role}
      aria-live={toast.ariaProps["aria-live"]}
      aria-atomic={toast.ariaProps["aria-atomic"]}
    >
      {isCustom ? (
        toast.message
      ) : typeof children === "function" ? (
        children({ icon, message })
      ) : (
        <>
          {icon}
          {message}
        </>
      )}
    </div>
  );
};
