import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "small" | "medium";

const classes = (
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth?: boolean,
  className?: string,
) => [
  "ui-button",
  `ui-button-${variant}`,
  `ui-button-${size}`,
  fullWidth ? "ui-button-full" : "",
  className ?? "",
].filter(Boolean).join(" ");

export function Button({
  variant = "secondary",
  size = "medium",
  fullWidth,
  icon,
  children,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: IconName;
}) {
  return (
    <button type={type} className={classes(variant, size, fullWidth, className)} {...props}>
      {icon && <Icon className="ui-button-icon" name={icon} size={size === "small" ? 17 : 19} />}
      <span className="ui-button-label">{children}</span>
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "medium",
  fullWidth,
  icon,
  children,
  className,
  ...props
}: LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <Link className={classes(variant, size, fullWidth, className)} {...props}>
      {icon && <Icon className="ui-button-icon" name={icon} size={size === "small" ? 17 : 19} />}
      <span className="ui-button-label">{children}</span>
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  variant = "secondary",
  size = "medium",
  className,
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={[
        "ui-icon-button",
        `ui-button-${variant}`,
        `ui-icon-button-${size}`,
        className ?? "",
      ].filter(Boolean).join(" ")}
      aria-label={label}
      {...props}
    >
      <Icon name={icon} size={size === "small" ? 19 : 22} />
    </button>
  );
}

export function IconButtonLink({
  icon,
  label,
  variant = "secondary",
  size = "medium",
  className,
  ...props
}: Omit<LinkProps, "children"> & {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      className={[
        "ui-icon-button",
        `ui-button-${variant}`,
        `ui-icon-button-${size}`,
        className ?? "",
      ].filter(Boolean).join(" ")}
      aria-label={label}
      {...props}
    >
      <Icon name={icon} size={size === "small" ? 19 : 22} />
    </Link>
  );
}

export function DetailIndicator({ label = "Ver detalle" }: { label?: string }) {
  return (
    <span className="ui-detail-indicator" aria-label={label}>
      <Icon name="chevronRight" size={17} />
    </span>
  );
}
