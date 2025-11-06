"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  loading?: boolean;
  spinnerSize?: number;
};

export default function ButtonWithLoader({ children, loading, className = "", spinnerSize = 16, ...props }: Props) {
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = typeof loading === "boolean" ? loading : internalLoading;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) {
      try {
        setInternalLoading(true);
        // call the provided onClick handler but don't await its inner logic
        // keep the spinner visible briefly to provide tactile feedback
        props.onClick(e);
        await new Promise((res) => setTimeout(res, 600));
      } finally {
        setInternalLoading(false);
      }
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      className={`${className} flex items-center justify-center gap-2 relative`}
      disabled={props.disabled || isLoading}
    >
      <span className="flex items-center gap-2">
        {isLoading && (
          <motion.span
            className="inline-block"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 0.8 }}
            style={{ width: spinnerSize, height: spinnerSize }}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
              <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </motion.span>
        )}
        <span className={isLoading ? "opacity-80" : ""}>{children}</span>
      </span>
    </button>
  );
}
