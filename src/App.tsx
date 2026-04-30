import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";

const App = () => (
  <CoreProviders>
    <AppRoutes />
  </CoreProviders>
);

export default App;