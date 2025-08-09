import * as React from "react";
import intrigLogo from "../assets/intrig-logo.svg?inline";

export function Logo() {
  return (
    <div className="flex items-center gap-2 p-3">
      <img src={intrigLogo} alt="Intrig Logo" className="h-8" />
      <div className={'text-lg'}>|</div>
      <div className={'text-2xl'}>Insight</div>
    </div>
  );
}