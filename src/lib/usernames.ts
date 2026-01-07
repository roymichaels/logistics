const WALLET_ADDRESS_PATTERN = /^(0x[a-fA-F0-9]{40}|[A-HJ-NP-Za-km-z1-9]{32,44}|[A-Za-z0-9]{48}|EQ[A-Za-z0-9_-]{46})$/;

export function isWalletAddress(str: string): boolean {
  if (!str) return false;
  return WALLET_ADDRESS_PATTERN.test(str.trim());
}

export function isValidUsername(username: string | null | undefined): boolean {
  if (!username) return false;

  const trimmed = username.trim();

  if (trimmed.length === 0) return false;

  if (isWalletAddress(trimmed)) return false;

  if (trimmed.startsWith('@')) {
    const handle = trimmed.slice(1);
    return handle.length > 0 && /^[a-zA-Z0-9_]+$/.test(handle);
  }

  return /^[a-zA-Z0-9_]+$/.test(trimmed);
}

export function formatUsername(username: string | null | undefined): string | null {
  if (!username) return null;

  const trimmed = username.trim();

  if (!isValidUsername(trimmed)) return null;

  if (trimmed.startsWith('@')) {
    return trimmed;
  }

  return `@${trimmed}`;
}

export function getDisplayName(user: {
  name?: string | null;
  first_name?: string | null;
  username?: string | null;
  wallet_address?: string | null;
}): string {
  if (user.name && user.name.trim()) {
    if (!isWalletAddress(user.name)) {
      return user.name.trim();
    }
  }

  if (user.first_name && user.first_name.trim()) {
    if (!isWalletAddress(user.first_name)) {
      return user.first_name.trim();
    }
  }

  const formattedUsername = formatUsername(user.username);
  if (formattedUsername) {
    return formattedUsername;
  }

  return 'User';
}

export function getUserHandle(user: {
  username?: string | null;
}): string | null {
  return formatUsername(user.username);
}

export function extractUsername(usernameWithAt: string): string {
  if (!usernameWithAt) return '';

  if (usernameWithAt.startsWith('@')) {
    return usernameWithAt.slice(1);
  }

  return usernameWithAt;
}

export function shortenWalletAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (!address || address.length < prefixLength + suffixLength) {
    return address;
  }

  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
