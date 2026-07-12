import { Navigate, useParams } from 'react-router-dom';

/**
 * Redireciona /proposta/calculadora/:proposalId -> /calculadora/:proposalId
 * interpolando o parâmetro real (Navigate com string literal não substitui :param).
 */
const RedirectToCalculadora = () => {
  const { proposalId } = useParams();
  return <Navigate to={`/calculadora/${proposalId}`} replace />;
};

export default RedirectToCalculadora;
