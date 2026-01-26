import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | number | null;
  onChange: (value: string) => void;
  type?: "text" | "number" | "textarea";
  className?: string;
  displayClassName?: string;
  placeholder?: string;
  formatAsCurrency?: boolean;
}

export function EditableCell({
  value,
  onChange,
  type = "text",
  className,
  displayClassName,
  placeholder = "-",
  formatAsCurrency = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value?.toString() ?? "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== (value?.toString() ?? "")) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setEditValue(value?.toString() ?? "");
      setIsEditing(false);
    }
  };

  const displayValue = value !== null && value !== "" ? value : placeholder;

  if (isEditing) {
    if (type === "textarea") {
      return (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn("min-h-[80px] text-sm", className)}
        />
      );
    }

    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("h-8 text-sm", className)}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer rounded px-2 py-1 hover:bg-muted/50 transition-colors min-h-[32px] flex items-center",
        displayClassName
      )}
    >
      {type === "textarea" ? (
        <div className="whitespace-pre-line">{displayValue}</div>
      ) : (
        <span className={value === null || value === "" ? "text-muted-foreground/50" : ""}>
          {type === "number" && typeof value === "number"
            ? formatAsCurrency 
              ? `£${value.toLocaleString("en-GB")}`
              : value.toLocaleString("en-GB")
            : displayValue}
        </span>
      )}
    </div>
  );
}
