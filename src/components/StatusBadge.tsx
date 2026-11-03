const VARIANT: Record<string, 'ok' | 'warn' | 'danger' | 'info' | ''> = {
  verified: 'ok', approved: 'ok', onboarded: 'ok', active: 'ok',
  pending: 'warn', expired: 'warn',
  new: 'info', contacted: 'info',
  rejected: 'danger', inactive: 'danger',
  dismissed: '',
};
export function StatusBadge({ status }: { status: string }) {
  const v = VARIANT[status.toLowerCase()] ?? '';
  return <span className={'badge ' + (v ? 'badge--' + v : '')}>{status}</span>;
}
