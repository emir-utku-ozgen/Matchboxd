"use client";

import { Star } from "lucide-react";

type Props = {
  rating: number; // 1-10
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export default function RatingStars({
  rating,
  max = 10,
  size = "md",
  className = "",
}: Props) {
  const value = Math.min(max, Math.max(0, Math.round(rating)));
  const iconClass = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[var(--stadium-green)] ${className}`}
      title={`${value}/${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${iconClass} shrink-0 ${i < value ? "fill-current" : "fill-transparent opacity-30"}`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
