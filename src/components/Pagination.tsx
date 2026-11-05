interface Props { offset: number; limit: number; count: number; onChange: (offset: number) => void }

export function Pagination({ offset, limit, count, onChange }: Props) {
  return (
    <div className='cluster pagination'>
      <button className='btn btn--sm' aria-label='Previous page' disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>‹ Prev</button>
      <span className='muted'>{count === 0 ? 'None' : `${offset + 1}–${offset + count}`}</span>
      <button className='btn btn--sm' aria-label='Next page' disabled={count < limit} onClick={() => onChange(offset + limit)}>Next ›</button>
    </div>
  );
}
