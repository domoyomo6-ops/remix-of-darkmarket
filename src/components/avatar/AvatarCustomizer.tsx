import { useState, useEffect } from 'react';
import { Sparkles, Crown, Flame, Star, Lock, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AvatarItem {
  id: string;
  type: 'frame' | 'picture' | 'badge';
  name: string;
  description: string;
  image_url: string | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlock_type: string;
  price: number;
  is_active: boolean;
}

interface UserAvatar {
  display_name: string;
  avatar_url: string;
  title: string;
  level: number;
  equipped_frame: string | null;
  equipped_picture: string | null;
  equipped_badges: string[];
}

const rarityColors = {
  common: 'border-zinc-500 bg-zinc-500/10',
  rare: 'border-blue-500 bg-blue-500/10',
  epic: 'border-purple-500 bg-purple-500/10',
  legendary: 'border-amber-500 bg-amber-500/10 animate-pulse',
};

const rarityIcons = {
  common: <Star className="w-3 h-3" />,
  rare: <Sparkles className="w-3 h-3" />,
  epic: <Crown className="w-3 h-3" />,
  legendary: <Flame className="w-3 h-3" />,
};

// Frame visual components for preview
const frameStyles: Record<string, string> = {
  'Default Frame': 'border-2 border-primary/50',
  'Neon Green': 'border-2 border-primary shadow-[0_0_15px_hsl(142_70%_45%/0.8)]',
  'Cyber Gold': 'border-2 border-amber-400 shadow-[0_0_20px_hsl(45_93%_47%/0.6)]',
  'Legendary Fire': 'border-2 border-orange-500 animate-pulse shadow-[0_0_25px_hsl(30_100%_50%/0.7)]',
};

// Avatar pictures
const pictureEmojis: Record<string, string> = {
  'Hacker': '🎭',
  'Skull': '💀',
  'Robot': '🤖',
  'Ghost': '👻',
};

export default function AvatarCustomizer({ trigger }: { trigger?: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [userAvatar, setUserAvatar] = useState<UserAvatar | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [selectedPicture, setSelectedPicture] = useState<string | null>(null);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all items
    const { data: itemsData } = await supabase
      .from('avatar_items')
      .select('*')
      .eq('is_active', true)
      .order('rarity');

    // Fetch user's unlocked items
    const { data: unlockedData } = await supabase
      .from('user_avatar_items')
      .select('item_id')
      .eq('user_id', user.id);

    // Fetch user's avatar settings
    const { data: avatarData } = await supabase
      .from('user_avatars')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (itemsData) setItems(itemsData as AvatarItem[]);
    if (unlockedData) setUnlockedIds(unlockedData.map(u => u.item_id));
    if (avatarData) {
      setUserAvatar(avatarData);
      setSelectedFrame(avatarData.equipped_frame);
      setSelectedPicture(avatarData.equipped_picture);
      setSelectedBadges(avatarData.equipped_badges || []);
    }
    
    setLoading(false);
  };

  const unlockItem = async (item: AvatarItem) => {
    if (!user) return;

    if (item.price > 0) {
      // Check wallet balance
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < item.price) {
        toast.error('Insufficient balance');
        return;
      }

      // Deduct from wallet
      const { error: walletError } = await supabase
        .from('user_wallets')
        .update({ balance: wallet.balance - item.price })
        .eq('user_id', user.id);

      if (walletError) {
        toast.error('Failed to process payment');
        return;
      }

      // Record transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount: -item.price,
        description: `Unlocked ${item.name} (${item.type})`,
      });
    }

    // Unlock the item
    const { error } = await supabase
      .from('user_avatar_items')
      .insert({ user_id: user.id, item_id: item.id });

    if (error) {
      toast.error('Failed to unlock item');
    } else {
      toast.success(`Unlocked ${item.name}!`);
      setUnlockedIds([...unlockedIds, item.id]);
    }
  };

  const saveEquipped = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('user_avatars')
      .upsert({
        user_id: user.id,
        equipped_frame: selectedFrame,
        equipped_picture: selectedPicture,
        equipped_badges: selectedBadges,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Avatar updated!');
      setOpen(false);
    }
    setSaving(false);
  };

  const toggleBadge = (id: string) => {
    if (selectedBadges.includes(id)) {
      setSelectedBadges(selectedBadges.filter(b => b !== id));
    } else if (selectedBadges.length < 3) {
      setSelectedBadges([...selectedBadges, id]);
    } else {
      toast.error('Maximum 3 badges');
    }
  };

  const frames = items.filter(i => i.type === 'frame');
  const pictures = items.filter(i => i.type === 'picture');
  const badges = items.filter(i => i.type === 'badge');

  const getFrameStyle = (frameName: string) => frameStyles[frameName] || frameStyles['Default Frame'];
  const getPictureEmoji = (pictureName: string) => pictureEmojis[pictureName] || '👤';

  const selectedFrameItem = frames.find(f => f.id === selectedFrame);
  const selectedPictureItem = pictures.find(p => p.id === selectedPicture);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Customize Avatar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AVATAR CUSTOMIZER
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="relative">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl bg-black ${selectedFrameItem ? getFrameStyle(selectedFrameItem.name) : 'border-2 border-primary/30'}`}>
                  {selectedPictureItem ? getPictureEmoji(selectedPictureItem.name) : '👤'}
                </div>
                {/* Equipped badges preview */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {selectedBadges.slice(0, 3).map((badgeId) => {
                    const badge = badges.find(b => b.id === badgeId);
                    return badge ? (
                      <div key={badgeId} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${rarityColors[badge.rarity]}`}>
                        {rarityIcons[badge.rarity]}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            <Tabs defaultValue="frames" className="w-full">
              <TabsList className="w-full bg-black/50 border border-primary/30">
                <TabsTrigger value="frames" className="flex-1 font-mono">Frames</TabsTrigger>
                <TabsTrigger value="pictures" className="flex-1 font-mono">Pictures</TabsTrigger>
                <TabsTrigger value="badges" className="flex-1 font-mono">Badges</TabsTrigger>
              </TabsList>

              <TabsContent value="frames" className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {frames.map((item) => {
                    const isUnlocked = unlockedIds.includes(item.id) || item.price === 0;
                    const isEquipped = selectedFrame === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => isUnlocked ? setSelectedFrame(item.id) : unlockItem(item)}
                        className={`relative p-4 rounded-lg border transition-all ${
                          isEquipped 
                            ? 'border-primary bg-primary/20' 
                            : `${rarityColors[item.rarity]} hover:scale-105`
                        }`}
                      >
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl bg-black ${getFrameStyle(item.name)}`}>
                          👤
                        </div>
                        <p className="text-sm font-mono text-center mt-2">{item.name}</p>
                        <Badge className={`absolute top-2 right-2 text-[10px] ${rarityColors[item.rarity]}`}>
                          {item.rarity}
                        </Badge>
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <Lock className="w-5 h-5 mx-auto text-muted-foreground" />
                              {item.price > 0 && <p className="text-xs text-primary mt-1">${item.price}</p>}
                            </div>
                          </div>
                        )}
                        {isEquipped && (
                          <div className="absolute top-2 left-2">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="pictures" className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pictures.map((item) => {
                    const isUnlocked = unlockedIds.includes(item.id) || item.price === 0;
                    const isEquipped = selectedPicture === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => isUnlocked ? setSelectedPicture(item.id) : unlockItem(item)}
                        className={`relative p-4 rounded-lg border transition-all ${
                          isEquipped 
                            ? 'border-primary bg-primary/20' 
                            : `${rarityColors[item.rarity]} hover:scale-105`
                        }`}
                      >
                        <div className="text-4xl text-center">{getPictureEmoji(item.name)}</div>
                        <p className="text-sm font-mono text-center mt-2">{item.name}</p>
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <Lock className="w-5 h-5 mx-auto text-muted-foreground" />
                              {item.price > 0 && <p className="text-xs text-primary mt-1">${item.price}</p>}
                            </div>
                          </div>
                        )}
                        {isEquipped && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="badges" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Select up to 3 badges to display</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {badges.map((item) => {
                    const isUnlocked = unlockedIds.includes(item.id);
                    const isEquipped = selectedBadges.includes(item.id);
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => isUnlocked && toggleBadge(item.id)}
                        disabled={!isUnlocked}
                        className={`relative p-3 rounded-lg border transition-all ${
                          isEquipped 
                            ? 'border-primary bg-primary/20' 
                            : `${rarityColors[item.rarity]} ${isUnlocked ? 'hover:scale-105' : 'opacity-50'}`
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rarityColors[item.rarity]}`}>
                            {rarityIcons[item.rarity]}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-mono">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        {!isUnlocked && (
                          <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />
                        )}
                        {isEquipped && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={saveEquipped} disabled={saving} className="w-full crt-button">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}