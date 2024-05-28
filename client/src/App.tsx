import './App.css';

import MainPage from './pages/MainPage';
import FileSharePage from './pages/FileSharePage';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/rooms/:id" element={<FileSharePage />} />
      </Routes>
    </Router>
  );
}

export default App;
