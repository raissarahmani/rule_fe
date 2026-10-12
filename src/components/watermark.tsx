"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/context/auth-context";

function getFormattedDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

const emptySubscribe = () => () => {};

export function Watermark() {
  const { userDomain } = useAuth()
  const timestamp = useSyncExternalStore(
    emptySubscribe,
    getFormattedDate,
    () => ""
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20 select-none">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Pattern unit box: adjust width/height to control spacing */}
          <pattern
            id="watermark-pattern"
            width="220"
            height="160"
            patternUnits="userSpaceOnUse"
          >
            {/* Rotate -30 degrees around center of pattern tile */}
            <g transform="rotate(-30 110 80)">
              {/* Logo Image */}
              <image
                href="/bcas-wm.png"
                x="5"
                y="30"
                width="200"
                height="70"
                preserveAspectRatio="xMidYMid meet"
              />
              {/* Timestamp Text directly below logo */}
              <text
                x="110"
                y="95"
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[14px] font-semibold tracking-wider"
              >
                {userDomain} {timestamp}
              </text>
            </g>
          </pattern>
        </defs>

        {/* Tile the pattern infinitely across the container */}
        <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
      </svg>
    </div>
  );
}