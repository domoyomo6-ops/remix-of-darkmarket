import { ReactNode } from 'react';
import Header from './Header';
import SupportChatBox from '@/components/support/SupportChatBox';
import MusicPlayer from '@/components/music/MusicPlayer';
 import ParallaxBackground from '@/components/ParallaxBackground';
interface MainLayoutProps {
  children: ReactNode;
}
export default function MainLayout({
  children
}: MainLayoutProps) {
   return <div className="min-h-screen bg-background pb-0 ml-0 relative">
       <ParallaxBackground />
      <Header />
       <main className="relative z-10">{children}</main>
      <SupportChatBox />
      <MusicPlayer />
    </div>;
}