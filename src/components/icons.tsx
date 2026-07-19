import { type CSSProperties, type ReactNode } from "react";
import type { ToastType, IconTheme } from "../types/toast";

const iconStageStyle: CSSProperties = {
  position: "relative",
  flex: "0 0 20px",
  width: 20,
  height: 20,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const DefaultSpinner = () => {
  return (
    <span style={iconStageStyle}>
      <svg
        className="toast-motion-spin"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
        style={{ animation: "toast-spin 0.9s linear infinite" }}
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="2"
        />
        <path
          d="M18 10a8 8 0 0 1-8 8"
          fill="none"
          stroke="#616161"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

export const DefaultSuccess = ({ theme }: { theme?: IconTheme }) => {
  const primary = theme?.primary || "#61d345";
  const secondary = theme?.secondary || "#fff";

  return (
    <span style={iconStageStyle}>
      <svg
        className="toast-motion-status"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
        style={{ animation: "toast-icon-status 0.36s cubic-bezier(0.21, 1.02, 0.73, 1) forwards" }}
      >
        <circle cx="10" cy="10" r="10" fill={primary} />
        <path
          className="toast-motion-check"
          d="M5.8 10.4 8.6 13.1 14.6 7.2"
          fill="none"
          stroke={secondary}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: "toast-icon-stroke 0.28s 0.16s cubic-bezier(0.21, 1.02, 0.73, 1) forwards",
            opacity: 0,
            strokeDasharray: 18,
            strokeDashoffset: 18,
          }}
        />
      </svg>
    </span>
  );
};

export const DefaultError = ({ theme }: { theme?: IconTheme }) => {
  const primary = theme?.primary || "#ff4b4b";
  const secondary = theme?.secondary || "#fff";

  return (
    <span style={iconStageStyle}>
      <svg
        className="toast-motion-status"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
        style={{ animation: "toast-icon-status 0.36s cubic-bezier(0.21, 1.02, 0.73, 1) forwards" }}
      >
        <circle cx="10" cy="10" r="10" fill={primary} />
        <path
          className="toast-motion-cross-first"
          d="M6.7 6.7 13.3 13.3"
          fill="none"
          stroke={secondary}
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{
            animation: "toast-icon-stroke 0.22s 0.14s cubic-bezier(0.21, 1.02, 0.73, 1) forwards",
            opacity: 0,
            strokeDasharray: 10,
            strokeDashoffset: 10,
          }}
        />
        <path
          className="toast-motion-cross-second"
          d="M13.3 6.7 6.7 13.3"
          fill="none"
          stroke={secondary}
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{
            animation: "toast-icon-stroke 0.22s 0.2s cubic-bezier(0.21, 1.02, 0.73, 1) forwards",
            opacity: 0,
            strokeDasharray: 10,
            strokeDashoffset: 10,
          }}
        />
      </svg>
    </span>
  );
};

export const ToastIcon = ({
  type,
  icon,
  iconTheme,
}: {
  type: ToastType;
  icon?: ReactNode;
  iconTheme?: IconTheme;
}) => {
  if (icon !== undefined) {
    return <>{icon}</>;
  }

  switch (type) {
    case "blank":
    case "custom":
      return null;
    case "loading":
      return <DefaultSpinner />;
    case "success":
      return <DefaultSuccess theme={iconTheme} />;
    case "error":
      return <DefaultError theme={iconTheme} />;
  }
};
