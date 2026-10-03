import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import UiKitPage from './pages/dev/UiKitPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dev/ui" element={<UiKitPage />} />
      </Routes>
    </BrowserRouter>
  );
}
