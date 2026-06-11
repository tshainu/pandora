import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Evaluate from './pages/Evaluate';
import Evaluations from './pages/Evaluations';
import Reports from './pages/Reports';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10000 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/evaluate" element={<Evaluate />} />
            <Route path="/evaluations" element={<Evaluations />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
