import Layout from './components/Layout';
import { DownloadProvider } from './context/DownloadContext';
import { ThemeProvider } from './context/ThemeContext';
import './i18n/i18n'; // Initialize i18n before rendering

function App() {
  return (
    <ThemeProvider>
      <DownloadProvider>
        <Layout />
      </DownloadProvider>
    </ThemeProvider>
  );
}

export default App;
