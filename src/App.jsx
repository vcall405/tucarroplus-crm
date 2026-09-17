import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard.jsx';
import './styles.css';

export default function App() {
  return <Dashboard />;
}

createRoot(document.getElementById('root')).render(<App />);
