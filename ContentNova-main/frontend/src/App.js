import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FormPage from './pages/FormPage';
import OutputPage from './pages/OutputPage';

function App() {
  const [results, setResults] = useState(null);
  const [formData, setFormData] = useState(null);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <FormPage
              onResults={(data, form) => {
                setResults(data);
                setFormData(form);
              }}
            />
          }
        />
        <Route
          path="/output"
          element={
            results ? (
              <OutputPage results={results} formData={formData} onReset={() => setResults(null)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
