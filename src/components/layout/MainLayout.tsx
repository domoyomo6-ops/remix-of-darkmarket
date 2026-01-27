import { ReactNode } from 'react';
import Header from './Header';
import SupportChatBox from '@/components/support/SupportChatBox';
import MusicPlayer from '@/components/music/MusicPlayer';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>{children}</main>
      <SupportChatBox />
      <MusicPlayer />
    </div>
  );
}
