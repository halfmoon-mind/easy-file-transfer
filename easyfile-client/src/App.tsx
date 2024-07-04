import './App.css';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import MainPage from './pages/MainPage';
import SharePage from './pages/SharePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/rooms/:id" element={<SharePage />} />
      </Routes>
    </Router>
  );
}

export default App;
