import { useEffect } from "react";

export function MobileAutoFixer() {
  useEffect(() => {
    const fixOverflow = () => {
      // Find all elements that might overflow
      const elements = document.querySelectorAll('.dialog-content, [role="dialog"], .popover-content');
      
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        
        if (rect.width > window.innerWidth) {
          htmlEl.style.maxWidth = '100vw';
          htmlEl.style.overflowX = 'hidden';
          htmlEl.style.boxSizing = 'border-box';
          
          // If it's a dialog content, ensure it doesn't have double padding issues
          if (htmlEl.classList.contains('p-6') || htmlEl.classList.contains('p-4')) {
            htmlEl.style.paddingLeft = '1rem';
            htmlEl.style.paddingRight = '1rem';
          }
        }
        
        // Check children for overflow
        const children = htmlEl.querySelectorAll('*');
        children.forEach((child) => {
          const childEl = child as HTMLElement;
          const childRect = childEl.getBoundingClientRect();
          if (childRect.right > rect.right || childRect.left < rect.left) {
            childEl.style.maxWidth = '100%';
            childEl.style.overflowX = 'hidden';
          }
        });
      });
    };

    const observer = new MutationObserver(fixOverflow);
    observer.observe(document.body, { childList: true, subtree: true });
    
    window.addEventListener('resize', fixOverflow);
    fixOverflow();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fixOverflow);
    };
  }, []);

  return null;
}
