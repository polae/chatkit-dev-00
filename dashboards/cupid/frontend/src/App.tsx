import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'
import SessionsPage from '@/pages/SessionsPage'
import ConversationPage from '@/pages/ConversationPage'
import AgentsPage from '@/pages/AgentsPage'
import MetricsPage from '@/pages/MetricsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:sessionId" element={<ConversationPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
      </Route>
    </Routes>
  )
}
