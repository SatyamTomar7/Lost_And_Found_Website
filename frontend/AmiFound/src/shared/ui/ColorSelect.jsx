import { forwardRef, useEffect, useId, useRef, useState } from "react";
import styles from "./ColorSelect.module.css";

const ColorSelect = forwardRef(function ColorSelect(
  {
    name,
    value = "",
    onChange,
    onBlur,
    options,
    placeholder = "Select a color",
    disabled = false,
    invalid = false,
    id,
  },
  forwardedRef,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.name === value);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option.name === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [options, value]);

  const selectOption = (option) => {
    onChange?.({ target: { name, value: option.name }, type: "change" });
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex(
        (current) => (current + direction + options.length) % options.length,
      );
    } else if (event.key === "Home" && isOpen) {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === "End" && isOpen) {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && isOpen) {
      event.preventDefault();
      selectOption(options[highlightedIndex]);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <input
        ref={forwardedRef}
        type="hidden"
        name={name}
        value={value}
        onChange={() => {}}
        onBlur={onBlur}
      />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        name={name}
        className={`${styles.trigger} ${invalid ? styles.invalid : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-invalid={invalid ? "true" : "false"}
      >
        {selectedOption ? (
          <>
            <span
              className={`${styles.swatch} ${
                selectedOption.name === "Multi-colored" ? styles.multicolor : ""
              }`}
              style={
                selectedOption.name === "Multi-colored"
                  ? undefined
                  : { background: selectedOption.value }
              }
              aria-hidden="true"
            />
            <span>{selectedOption.name}</span>
          </>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen && (
        <ul
          id={listboxId}
          className={styles.options}
          role="listbox"
          aria-label="Color options"
        >
          {options.map((option, index) => (
            <li
              key={option.name}
              role="option"
              aria-selected={option.name === value}
              className={`${styles.option} ${
                index === highlightedIndex ? styles.highlighted : ""
              } ${option.name === value ? styles.selected : ""}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              <span
                className={`${styles.swatch} ${
                  option.name === "Multi-colored" ? styles.multicolor : ""
                }`}
                style={
                  option.name === "Multi-colored"
                    ? undefined
                    : { background: option.value }
                }
                aria-hidden="true"
              />
              <span>{option.name}</span>
              {option.name === value && (
                <span className={styles.checkmark} aria-hidden="true">
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default ColorSelect;
