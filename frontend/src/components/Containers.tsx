import React, { PropsWithChildren, forwardRef } from "react";
import { Box } from "@mui/material";
import clsx from "clsx";

export const Cell = ({
  children,
  className,
  size
}: React.PropsWithChildren<{ size: "s" | "m"; className?: string }>) => (
  <Box className={clsx(size === "s" && "px-1 py-[2px]", size === "m" && "py-1", className)}>{children}</Box>
);

export const Table = ({ children, className }: React.PropsWithChildren<{ className?: string }>) => {
  return <div className={clsx("flex flex-col", className)}>{children}</div>;
};

export const TableRow = ({
  children,
  cols,
  className
}: React.PropsWithChildren<{ cols: string; className?: string }>) => {
  return <div className={clsx("grid", cols, className)}>{children}</div>;
};

export const TableBody = forwardRef<HTMLDivElement, React.PropsWithChildren<{ className?: string }>>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx("disable-scrollbar relative flex grow flex-col overflow-scroll scroll-smooth", className)}
      >
        <div className="absolute h-full w-full">{children}</div>
      </div>
    );
  }
);

TableBody.displayName = "TableBody";

export const TableItem = ({ children }: PropsWithChildren) => {
  return <div className="text-label py-1 text-label-primary">{children}</div>;
};
