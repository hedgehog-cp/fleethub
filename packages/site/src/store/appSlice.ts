import { AppThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { GkcoiTheme } from "../utils";

import { entitiesSlice } from "./entities/entitiesSlice";

type AppState = {
  fileId?: string;
  explorerOpen: boolean;
  importToTemp: boolean;
  gkcoiTheme: GkcoiTheme;
};

const initialState: AppState = {
  explorerOpen: true,
  importToTemp: false,
  gkcoiTheme: "dark",
};

export const appSlice = createSlice({
  name: "app",
  initialState,

  reducers: {
    openFile: (state, { payload }: PayloadAction<string>) => {
      if (state.fileId !== payload) state.fileId = payload;
    },
    toggleExplorerOpen: (state) => {
      state.explorerOpen = !state.explorerOpen;
    },
    setImportToTemp: (state, { payload }: PayloadAction<boolean>) => {
      state.importToTemp = payload;
    },
    setGkcoiTheme: (state, { payload }: PayloadAction<GkcoiTheme>) => {
      state.gkcoiTheme = payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(entitiesSlice.actions.createPlan, (state, { payload }) => {
        state.fileId = payload.input.id;
      })
      .addCase(entitiesSlice.actions.import, (state, { payload }) => {
        state.fileId = payload.result;
      });
  },
});

export const openDefaultFile = (): AppThunk => (dispatch, getState) => {
  const root = getState();
  const rootIds = root.present.entities.files.rootIds;

  if (rootIds.length) {
    dispatch(appSlice.actions.openFile(rootIds[rootIds.length - 1]));
  }
};
