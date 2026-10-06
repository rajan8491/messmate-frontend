import AppRoutes from './routes/AppRoutes'
import { GoogleOAuthProvider } from '@react-oauth/google'

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppRoutes />
    </GoogleOAuthProvider> 
  )
}

export default App
