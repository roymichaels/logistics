// Telegram UI hook stub - removed from architecture
// This file exists only to prevent build errors in legacy components

export function useTelegramUI() {
  return {
    isTelegram: false,
    backButton: {
      show: () => {},
      hide: () => {},
    },
    mainButton: {
      show: () => {},
      hide: () => {},
      setText: () => {},
      onClick: () => {},
    },
  };
}

export default useTelegramUI;
