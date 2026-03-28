import ShaderBackground from "@/components/ui/shader-background";
import NeuralLoading from "@/components/system-entry/NeuralLoading";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black">
      <ShaderBackground />
      <div className="relative z-10 flex flex-col items-center">
        <NeuralLoading active durationMultiplier={1} />
      </div>
    </div>
  );
}

export default PageLoader;
