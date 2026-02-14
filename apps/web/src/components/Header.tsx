interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'VIBE Task View' }: HeaderProps) {
  return (
    <header style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h1>
    </header>
  );
}
