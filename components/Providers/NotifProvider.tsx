'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useStore } from '@/store/useStore'

export default function NotifProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Realtime Notifications Listener (Global)
    const initRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const channel = supabase
        .channel('global-notifs')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        }, (payload: any) => {
          const { unreadNotificationsCount, setUnreadNotificationsCount } = useStore.getState() as any
          setUnreadNotificationsCount(unreadNotificationsCount + 1)

          const typeLabel = payload.new.type === 'like' ? 'a aimé votre vidéo' : 
                          payload.new.type === 'comment' ? 'a commenté votre vidéo' :
                          payload.new.type === 'follow' ? 'a commencé à vous suivre' :
                          'Nouvelle interaction reçue';
          
          toast.success(typeLabel, {
            icon: '🔔',
            duration: 4000,
            style: { background: '#fe2c55', color: '#fff' }
          });
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${session.user.id}`
        }, () => {
          const { unreadMessagesCount, setUnreadMessagesCount } = useStore.getState() as any
          setUnreadMessagesCount(unreadMessagesCount + 1)
          
          toast.success('Nouveau message reçu', {
            icon: '💬',
            duration: 3000,
            style: { background: '#fe2c55', color: '#fff' }
          });
        })
        .subscribe();

      return channel;
    };

    let channel: any;
    initRealtime().then(c => channel = c);

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return <>{children}</>;
}
