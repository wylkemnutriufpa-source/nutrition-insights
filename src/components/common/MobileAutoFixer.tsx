import { useEffect } from "react";

export function MobileAutoFixer() {
  useEffect(() => {
    const originalStyles = new Map<HTMLElement, { maxWidth: string, overflowX: string, boxSizing: string, paddingLeft: string, paddingRight: string }>();

    const fixOverflow = () => {
      const activeDialogs = document.querySelectorAll('[role="dialog"], .dialog-content');
      
      const applyFix = (el: HTMLElement) => {
        if (!el.hasAttribute('data-autofixed')) {
          // Store original styles before applying fixes
          originalStyles.set(el, {
            maxWidth: el.style.maxWidth,
            overflowX: el.style.overflowX,
            boxSizing: el.style.boxSizing,
            paddingLeft: el.style.paddingLeft,
            paddingRight: el.style.paddingRight
          });
          
          el.setAttribute('data-autofixed', 'true');
        }
        
        const rect = el.getBoundingClientRect();
        
        if (rect.width > window.innerWidth) {
          el.style.maxWidth = '100vw';
          el.style.overflowX = 'hidden';
          el.style.boxSizing = 'border-box';
          
          if (el.classList.contains('p-6') || el.classList.contains('p-4')) {
            el.style.paddingLeft = '1rem';
            el.style.paddingRight = '1rem';
          }
        }
        
        const children = el.querySelectorAll('*');
        children.forEach((child) => {
          const childEl = child as HTMLElement;
          const childRect = childEl.getBoundingClientRect();
          if (childRect.right > rect.right || childRect.left < rect.left) {
            if (!childEl.hasAttribute('data-autofixed')) {
              originalStyles.set(childEl, {
                maxWidth: childEl.style.maxWidth,
                overflowX: childEl.style.overflowX,
                boxSizing: childEl.style.boxSizing,
                paddingLeft: childEl.style.paddingLeft,
                paddingRight: childEl.style.paddingRight
              });
              childEl.setAttribute('data-autofixed', 'true');
            }
            childEl.style.maxWidth = '100%';
            childEl.style.overflowX = 'hidden';
          }
        });
      };

      if (activeDialogs.length > 0) {
        activeDialogs.forEach((d) => applyFix(d as HTMLElement));
      } else {
        // Revert styles when no dialog is active
        originalStyles.forEach((styles, el) => {
          el.style.maxWidth = styles.maxWidth;
          el.style.overflowX = styles.overflowX;
          el.style.boxSizing = styles.boxSizing;
          el.style.paddingLeft = styles.paddingLeft;
          el.style.paddingRight = styles.paddingRight;
          el.removeAttribute('data-autofixed');
        });
        originalStyles.clear();
      }
    };

    const observer = new MutationObserver((mutations) => {
      let shouldFix = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          shouldFix = true;
        }
      });
      if (shouldFix) fixOverflow();
    });
    
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
