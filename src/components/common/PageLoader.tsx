import { motion } from "framer-motion";
import { BrainLoaderScreen } from "./BrainLoader";

export function PageLoader() {
  return <BrainLoaderScreen visible={true} text="Iniciando FitJourney..." />;
}

export default PageLoader;