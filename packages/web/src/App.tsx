import React, { useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardView } from '@/views/DashboardView'
import { ConsoleView } from '@/views/ConsoleView'
import { PlayersView } from '@/views/PlayersView'
import { SettingsView } from '@/views/SettingsView'
import { AddonsView } from '@/views/AddonsView'
import { BackupsView } from '@/views/BackupsView'
import { FileManagerView } from '@/views/FileManagerView'
import { TunnelsView } from '@/views/TunnelsView'
import { useServerStore } from '@/stores/serverStore'
import { Toaster } from '@/components/ui/sonner'

export const App: React.FC = () => {
  const { activeTab, initWs, fetchStatus } = useServerStore()

  useEffect(() => {
    initWs()
    fetchStatus()
  }, [initWs, fetchStatus])

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'console':
        return <ConsoleView />
      case 'players':
        return <PlayersView />
      case 'settings':
        return <SettingsView />
      case 'addons':
        return <AddonsView />
      case 'backups':
        return <BackupsView />
      case 'files':
        return <FileManagerView />
      case 'tunnels':
        return <TunnelsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="h-screen h-dvh bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground overflow-hidden">
      {/* Top Navbar with Server Status & Controls */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Active Dashboard View Container */}
        <main className="flex-1 overflow-y-auto bg-muted/10 h-full min-h-0">
          {renderActiveView()}
        </main>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default App
