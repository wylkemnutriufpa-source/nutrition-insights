// Lightweight confetti effect for celebrations
export default function confetti() {
  const colors = ["#22c55e", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);

  for (let i = 0; i < 50; i++) {
    const particle = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 4;
    const left = Math.random() * 100;
    const delay = Math.random() * 300;
    const duration = Math.random() * 1000 + 1500;

    particle.style.cssText = `
      position:absolute;top:-10px;left:${left}%;
      width:${size}px;height:${size}px;
      background:${color};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      animation:confetti-fall ${duration}ms ease-in ${delay}ms forwards;
    `;
    container.appendChild(particle);
  }

  // Inject animation if not exists
  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 3000);
}
