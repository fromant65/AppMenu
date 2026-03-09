import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm shadow-sm",
          "placeholder:text-gray-400 focus:outline-none focus:ring-2",
          error
            ? "border-red-400 focus:ring-red-400"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          className,
        ].join(" ")}
      />
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
