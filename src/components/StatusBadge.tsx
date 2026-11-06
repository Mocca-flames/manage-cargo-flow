const VARIANT: Record<string, 'ok' | 'warn' | 'danger' | 'info' | ''> = {
  verified: 'ok', approved: 'ok', onboarded: 'ok', active: 'ok', open: 'ok',
  pending: 'warn', expired: 'warn', unverified: 'warn', assigned: 'warn',
  new: 'info', contacted: 'info', closed: 'info',
  rejected: 'danger', inactive: 'danger', suspended: 'danger',
  dismissed: '', superseded: '',
};
export function StatusBadge({ status }: { status: string }) {
  const v = VARIANT[status.toLowerCase()] ?? '';
  return <span className={'badge ' + (v ? 'badge--' + v : '')}>{status}</span>;
}
