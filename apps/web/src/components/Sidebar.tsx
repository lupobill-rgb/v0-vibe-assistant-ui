interface SidebarProps {
  children?: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <aside style={{ 
      width: '250px', 
      padding: '1rem', 
      borderRight: '1px solid #ddd',
      backgroundColor: '#fafafa',
      minHeight: '100vh'
    }}>
      {children}
    </aside>
  );
}
