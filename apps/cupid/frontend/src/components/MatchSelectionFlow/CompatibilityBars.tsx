import { useEffect, useState } from "react";
import type { CompatibilityData, AstrologicalReference } from "../../types/today";
import { getZodiacSymbol } from "../../types/today";

interface CompatibilityBarsProps {
  compatibility: CompatibilityData;
  mortalAstro: AstrologicalReference;
  matchAstro: AstrologicalReference;
  animate?: boolean;
}

interface BarData {
  planet: string;
  icon: string;
  score: number;
  mortalSign: string;
  matchSign: string;
  colorClass: string;
}

export function CompatibilityBars({
  compatibility,
  mortalAstro,
  matchAstro,
  animate = true,
}: CompatibilityBarsProps) {
  const [animatedWidths, setAnimatedWidths] = useState<Record<string, number>>({
    sun: 0,
    moon: 0,
    venus: 0,
    mars: 0,
  });

  const bars: BarData[] = [
    {
      planet: "sun",
      icon: "☀️",
      score: compatibility.sun_compatibility.score,
      mortalSign: mortalAstro.sun,
      matchSign: matchAstro.sun,
      colorClass: "ms-bar-yellow",
    },
    {
      planet: "moon",
      icon: "🌙",
      score: compatibility.moon_compatibility.score,
      mortalSign: mortalAstro.moon,
      matchSign: matchAstro.moon,
      colorClass: "ms-bar-purple",
    },
    {
      planet: "venus",
      icon: "💖",
      score: compatibility.venus_compatibility.score,
      mortalSign: mortalAstro.venus,
      matchSign: matchAstro.venus,
      colorClass: "ms-bar-pink",
    },
    {
      planet: "mars",
      icon: "🔥",
      score: compatibility.mars_compatibility.score,
      mortalSign: mortalAstro.mars,
      matchSign: matchAstro.mars,
      colorClass: "ms-bar-red",
    },
  ];

  useEffect(() => {
    if (animate) {
      // Animate bars with staggered delay
      bars.forEach((bar, index) => {
        setTimeout(() => {
          setAnimatedWidths((prev) => ({
            ...prev,
            [bar.planet]: bar.score,
          }));
        }, 100 + index * 100);
      });
    } else {
      // Set immediately without animation
      setAnimatedWidths({
        sun: bars[0].score,
        moon: bars[1].score,
        venus: bars[2].score,
        mars: bars[3].score,
      });
    }
  }, [compatibility, animate]);

  return (
    <div className="ms-compatibility-bars">
      {bars.map((bar) => (
        <div key={bar.planet} className="ms-compatibility-row">
          <div className="ms-compatibility-left">
            <span>{bar.icon}</span>
            <span>{getZodiacSymbol(bar.mortalSign)}</span>
          </div>
          <div className="ms-compatibility-bar-container">
            <div
              className={`ms-compatibility-bar ${bar.colorClass}`}
              style={{ width: `${animatedWidths[bar.planet]}%` }}
            >
              <span className="ms-compatibility-bar-value">{bar.score}</span>
            </div>
          </div>
          <div className="ms-compatibility-right">
            <span>{getZodiacSymbol(bar.matchSign)}</span>
            <span>{bar.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
