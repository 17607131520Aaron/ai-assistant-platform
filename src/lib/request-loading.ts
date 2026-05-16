import { create } from "zustand";

type RequestLoadingState = {
  pending: number;
  start: () => void;
  stop: () => void;
};

export const useRequestLoadingStore = create<RequestLoadingState>((set) => ({
  pending: 0,
  start: () =>
    set((state) => ({
      pending: state.pending + 1,
    })),
  stop: () =>
    set((state) => ({
      pending: Math.max(0, state.pending - 1),
    })),
}));

export const requestLoading = {
  start: () => useRequestLoadingStore.getState().start(),
  stop: () => useRequestLoadingStore.getState().stop(),
};
