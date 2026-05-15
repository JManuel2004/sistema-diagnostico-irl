import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryProvider } from './app/providers/QueryProvider';
import { QuestionnairePage } from './pages/questionnaire/questionnaire-page';

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/questionnaire" element={<QuestionnairePage />} />
          <Route path="*" element={<Navigate to="/questionnaire" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
