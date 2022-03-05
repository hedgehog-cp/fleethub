import { MasterData } from "fleethub-core";
import React from "react";
import { batch, Provider as ReduxProvider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import { ActionCreators } from "redux-undo";

import { createStore } from "./createStore";
import { entitiesSlice } from "./entities/entitiesSlice";
import { parseUrl } from "./parseUrl";

type StoreProviderProps = {
  masterData: MasterData;
};

const StoreProvider: React.FC<StoreProviderProps> = ({
  children,
  masterData,
}) => {
  const store = createStore();
  const persistor = persistStore(store);

  const handleBeforeLift = async () => {
    if (typeof window === "undefined") return;

    const url = new URL(location.href);
    window.history.replaceState(null, "", location.pathname);
    const parsed = url && (await parseUrl(masterData, url));

    batch(() => {
      store.dispatch(entitiesSlice.actions.sweep());

      if (parsed) {
        store.dispatch(entitiesSlice.actions.import(parsed));
      }

      store.dispatch(ActionCreators.clearHistory());
    });
  };

  return (
    <ReduxProvider store={store}>
      <PersistGate onBeforeLift={handleBeforeLift} persistor={persistor}>
        {children}
      </PersistGate>
    </ReduxProvider>
  );
};

export default StoreProvider;
