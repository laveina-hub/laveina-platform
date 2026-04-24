import { CheckIcon } from "@/components/icons";

// Layered success badge matching "Payment confirmed + QR code-v2.png":
//  - Outermost static halo (very faint, fades in).
//  - Two animated ping rings staggered 0.5s apart → wave effect.
//  - Solid green disk with a bouncy pop (success-pop keyframe).
//  - Check icon fades in 200ms after the disk lands.
// Only `--color-success` is defined in globals.css, so we use Tailwind v4
// `/opacity` modifiers on the base token for all halo layers. Every motion
// layer is hidden via `motion-reduce:hidden` so the static halo alone is
// visible for users who prefer no motion.
function AnimatedCheckBadge() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <span aria-hidden className="bg-success/10 animate-fade-in absolute inset-0 rounded-full" />
      <span
        aria-hidden
        className="bg-success/30 absolute inset-1 animate-ping rounded-full motion-reduce:hidden"
      />
      <span
        aria-hidden
        className="bg-success/20 absolute inset-3 animate-ping rounded-full [animation-delay:500ms] motion-reduce:hidden"
      />
      <div className="bg-success animate-success-pop motion-reduce:animate-fade-in relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
        <span className="animate-fade-in [animation-delay:300ms] motion-reduce:animate-none">
          <CheckIcon className="h-8 w-8 text-white" />
        </span>
      </div>
    </div>
  );
}

export { AnimatedCheckBadge };
