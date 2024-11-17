import { numericFormatter } from "react-number-format";
import BigNumber from "bignumber.js";

export const roundNumberWithMaxDigits = (
  num: number | BigNumber,
  maxDecimals: number,
  maxDigits: number = 6
): BigNumber => {
  const rounded = new BigNumber(num.toPrecision(maxDigits, BigNumber.ROUND_HALF_UP));
  return rounded.decimalPlaces(maxDecimals);
};

export const formatNumber = (n: number | BigNumber, decimalScale?: number, fixedDecimalScale?: boolean) => {
  if (n === 0 || (BigNumber.isBigNumber(n) && n.isZero()))
    return numericFormatter(String(n), { decimalScale: 2, fixedDecimalScale: true });

  const isSmallNumber = Math.abs(Number(n)) < 1e-6;

  if (isSmallNumber) {
    return n.toFixed(decimalScale);
  }

  return numericFormatter(String(n), {
    decimalScale,
    fixedDecimalScale,
    decimalSeparator: ".",
    thousandSeparator: ","
  });
};

export const getFormattedDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1; // Months are zero-indexed
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
};

export const getFormattedTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = "0" + date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();

  const formattedTime = hours.slice(-2) + ":" + minutes.slice(-2) + ":" + seconds.slice(-2);
  return formattedTime;
};
