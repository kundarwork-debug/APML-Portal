import { Button } from "@/components/ui/button";

interface HamburgerButtonProps {
  open: boolean;
  onToggle: () => void;
}

function Component({ open, onToggle }: HamburgerButtonProps) {
  return (
    <Button
      type="button"
      className="portal-menu-toggle group"
      variant="outline"
      size="icon"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-controls="portal-main-navigation"
    >
      <svg width={30} height={30} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
        <path
          className="portal-menu-line portal-menu-line-top-bottom"
          d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
        />
        <path className="portal-menu-line" d="M7 16 27 16" />
      </svg>
    </Button>
  );
}

export { Component };
