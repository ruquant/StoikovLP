import React, { PropsWithChildren } from "react";

interface ICopyToClickboardProps {
  id: string;
  isCopied: boolean;
  valueToCopy: string;
  onCopy: (v: string) => void;
}

export const CopyToClickboard = ({ id, valueToCopy, children, onCopy }: PropsWithChildren<ICopyToClickboardProps>) => {
  const handleClick = () => {
    navigator.clipboard.writeText(valueToCopy);
    onCopy(valueToCopy);
  };

  return (
    <>
      <a data-tooltip-id={id} className="cursor-pointer" onClick={handleClick}>
        {children}
      </a>
    </>
  );
};
