'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useTeam } from '@/contexts/TeamContext'

export function NotificationListener() {
  const { currentOrg } = useTeam()

  useEffect(() => {
    if (!currentOrg?.id) return
    const orgId = currentOrg.id
    const channel = supabase
      .channel('notifications-' + orgId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        const n = payload.new as { type: string; title: string; body: string; link?: string }
        if (n.type === 'upgrade_required') {
          toast.error(n.title, {
            description: n.body,
            duration: 8000,
            action: {
              label: 'Upgrade',
              onClick: () => { window.location.href = n.link ?? '/settings/billing' },
            },
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentOrg?.id])

  return null
}
