import { BrowserRouter } from "react-router-dom";
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";

const App = () => (
  <CoreProviders>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </CoreProviders>
);

export default App;
