import { StarIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Visual 1–5 star rating glyph. Outline when not filled, amber when filled.
 * Lives next to the admin rating surfaces since it's only used here; promote
 * to atoms/ if another feature needs it.
 */
export function StarsGlyph({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          size={14}
          filled={n <= stars}
          className={cn(n <= stars ? "text-amber-400" : "text-slate-300")}
        />
      ))}
    </div>
  );
}
