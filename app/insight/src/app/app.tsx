// Uncomment this line to use CSS modules
// import styles from './app.module.css';
import { Outlet, Link } from 'react-router-dom';

export function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-zinc-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Insight</h1>
          <nav>
            <ul className="flex space-x-4">
              <li><Link to="/" className="hover:text-zinc-300">Home</Link></li>
              <li><Link to="/about" className="hover:text-zinc-300">About</Link></li>
              <li><Link to="/dashboard" className="hover:text-zinc-300">Dashboard</Link></li>
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow">
        <Outlet />
      </main>
      
      <footer className="bg-zinc-800 text-white p-4">
        <div className="container mx-auto text-center">
          <p>© 2025 Insight Application</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
