interface Props { offset: number; limit: number; count: number; onChange: (offset: number) => void }

export function Pagination({ offset, limit, count, onChange }: Props) {
  return (
    <div className='cluster'>
      <button className='btn btn--sm' disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>Previous</button>
      <span className='muted'>{count === 0 ? 'No results' : 'Showing ' + (offset + 1) + '-' + (offset + count)}</span>
      <button className='btn btn--sm' disabled={count < limit} onClick={() => onChange(offset + limit)}>Next</button>
    </div>
  );
}
