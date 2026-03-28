import ShaderBackground from "@/components/ui/shader-background";
import NeuralLoading from "@/components/system-entry/NeuralLoading";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black">
      <ShaderBackground />
      <div className="relative z-10 flex items-center justify-center pointer-events-none scale-[0.3] sm:scale-[0.34] md:scale-[0.24]">
        <NeuralLoading active={true} durationMultiplier={1.2} />
      </div>
    </div>
  );
}

export default PageLoader;
