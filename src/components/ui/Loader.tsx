// Loader simples para uso em ProtectedRoute
export function Loader() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
      <span>Carregando...</span>
    </div>
  );
}
