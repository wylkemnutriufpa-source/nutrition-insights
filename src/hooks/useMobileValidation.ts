import { useEffect, useState } from "react";

export function useMobileValidation() {
  const [hasOverflow, setHasOverflow] = useState(false);
  const [overflowingElements, setOverflowingElements] = useState<string[]>([]);

  useEffect(() => {
    const checkOverflow = () => {
      const elements = document.querySelectorAll("*");
      const overflowing: string[] = [];
      let foundOverflow = false;

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth || rect.left < 0) {
          foundOverflow = true;
          const identifier = el.id || el.className.split(" ")[0] || el.tagName.toLowerCase();
          overflowing.push(identifier);
          
          // Auto-fix: try to add overflow-x-hidden to parent if it's a modal or main container
          if (el.classList.contains('dialog-content') || el.closest('[role="dialog"]')) {
            (el as HTMLElement).style.maxWidth = '100vw';
            (el as HTMLElement).style.overflowX = 'hidden';
          }
        }
      });

      setHasOverflow(foundOverflow);
      setOverflowingElements(overflowing);
    };

    const observer = new MutationObserver(checkOverflow);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", checkOverflow);
    checkOverflow();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, []);

  return { hasOverflow, overflowingElements };
}
