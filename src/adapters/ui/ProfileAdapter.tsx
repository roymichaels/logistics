export function mapUserToProfileVM(user: any) {
  return {
    displayName: user?.full_name ?? '',
    avatarUrl: user?.avatar_url ?? '',
    kycStatus: user?.kycStatus ?? 'unverified',
    stats: {}
  };
}
