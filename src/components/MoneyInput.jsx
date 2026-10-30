import React, { forwardRef, useEffect, useId, useRef, useState } from "react";
import { formatMoneyInput, formatVnd, parseMoney } from "../lib/money.js";
import "./money-input.css";

const MoneyInput = forwardRef(function MoneyInput(
  {
    value,
    onChange,
    defaultScale = 1000000,
    min = 0,
    max = 1000000000000,
    className = "input",
    helper = true,
    compact = false,
    onBlur,
    onFocus,
    onValidityChange,
    id,
    ...props
  },
  forwardedRef,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const input = useRef(null);
  const focused = useRef(false);
  const lastEmitted = useRef(value);
  const validityCallback = useRef(onValidityChange);
  validityCallback.current = onValidityChange;
  const [raw, setRaw] = useState(() =>
    formatMoneyInput(value, { defaultScale }),
  );
  const parsed = parseMoney(raw, {
    defaultScale,
    min: Number(min),
    max: Number(max),
  });
  const descriptionId = inputId + "-money-hint";
  const shorthandHint =
    defaultScale === 1000000
      ? "2.2 = 2,2 triệu · thêm đ để nhập tiền đồng"
      : defaultScale === 1000
        ? "2.2 = 2.200 đ · thêm đ để nhập số đồng"
        : "Nhập số đồng · 2k2 = 2.200 đ";
  useEffect(() => {
    // Parent echoes must not erase a trailing decimal or in-progress text.
    if (!focused.current || value !== lastEmitted.current) {
      setRaw(formatMoneyInput(value, { defaultScale }));
      lastEmitted.current = value;
    }
  }, [value, defaultScale]);
  useEffect(() => {
    input.current?.setCustomValidity(parsed.valid ? "" : parsed.error);
  }, [parsed.valid, parsed.error]);
  useEffect(() => {
    validityCallback.current?.(parsed.valid);
  }, [parsed.valid]);
  function attach(node) {
    input.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }
  const describedBy =
    [props["aria-describedby"], helper || !parsed.valid ? descriptionId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <span
      className={
        "money-input " +
        (compact ? "money-input-compact " : "") +
        (!parsed.valid ? "has-error" : "")
      }
    >
      <input
        {...props}
        ref={attach}
        id={inputId}
        className={className}
        type="text"
        inputMode="decimal"
        value={raw}
        aria-invalid={!parsed.valid || undefined}
        aria-describedby={describedBy}
        onFocus={(event) => {
          focused.current = true;
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focused.current = false;
          if (parsed.valid && !parsed.empty)
            setRaw(formatMoneyInput(parsed.value, { defaultScale }));
          onBlur?.(event);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setRaw(next);
          const result = parseMoney(next, {
            defaultScale,
            min: Number(min),
            max: Number(max),
          });
          event.target.setCustomValidity(result.valid ? "" : result.error);
          if (result.valid) {
            lastEmitted.current = result.value;
            onChange?.(result.value);
          }
        }}
      />
      {(helper || !parsed.valid) && (
        <small
          id={descriptionId}
          className="money-input-hint"
          aria-live="polite"
        >
          {!parsed.valid ? (
            parsed.error
          ) : parsed.empty ? (
            shorthandHint
          ) : (
            <>
              <b>{formatVnd(parsed.value)}</b>
              <span>{shorthandHint}</span>
            </>
          )}
        </small>
      )}
    </span>
  );
});
export default MoneyInput;
