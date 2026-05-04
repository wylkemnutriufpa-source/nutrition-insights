
import IndependentLoader from "../ui/IndependentLoader";

/**
 * PageLoader agora é um alias para o IndependentLoader
 * para garantir que todo o sistema use o loader "puro" e isolado.
 */
export const PageLoader = () => <IndependentLoader />;

export default PageLoader;
