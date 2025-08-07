import { render } from "@testing-library/react";
import { TunnelsContext } from "../context/tunnels";

const renderWithTunnels = (ui: React.ReactElement) => {
  const tunnels = {};
  return render(
    <TunnelsContext.Provider value={tunnels as any}>
      {ui}
    </TunnelsContext.Provider>,
  );
};

export { renderWithTunnels as render };
