'use client';

// =====================================================
// BUDDY BATTLE - Shop Component
// Weekly rotating shop with items and mystery boxes
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroDialog, RetroTabs, RetroToast, RetroBadge } from './ui/retro-button';
import type { MysteryBoxResult, BuddyItem, ItemRarity, ItemType } from '@/lib/buddy-battle/types';

// Flattened shop item interface for display (combines ShopItem with nested item fields)
interface DisplayShopItem {
  id: string;
  item_id: string;
  price: number;
  quantity_available?: number;
  is_featured: boolean;
  is_limited: boolean;
  // Flattened from item
  name: string;
  description: string;
  item_type: ItemType;
  rarity: ItemRarity;
  effect_type?: string;
  effect_value?: number;
  stat_modifier?: {
    stat: string;
    amount: number;
  };
  // Legacy aliases
  type?: ItemType;
}

interface MysteryBoxDisplay {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: string;
  type?: string;
  is_duplicate?: boolean;
  refund_points?: number;
}

interface ShopState {
  weekly_items: DisplayShopItem[];
  mystery_boxes: MysteryBoxDisplay[];
  player_points: number;
  refresh_countdown: string;
}

export function ShopScreen() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId as string;
  
  const { sounds, initAudio, isInitialized } = useRetroSounds();
  
  const [shopData, setShopData] = useState<ShopState | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [selectedItem, setSelectedItem] = useState<DisplayShopItem | null>(null);
  const [mysteryResult, setMysteryResult] = useState<MysteryBoxResult | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Fetch shop data
  useEffect(() => {
    async function fetchShop() {
      try {
        const response = await fetch('/api/buddy-battle/shop', { credentials: 'include' });
        const data = await response.json();
        setShopData(data);
      } catch (error) {
        console.error('Failed to fetch shop:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchShop();
  }, []);
  
  // Handle item purchase
  const handlePurchase = async (item: DisplayShopItem) => {
    if (!shopData || shopData.player_points < item.price) {
      sounds.error();
      setToast({ message: 'Not enough points!', type: 'error' });
      return;
    }
    
    setPurchasing(true);
    sounds.purchase();
    
    try {
      const response = await fetch('/api/buddy-battle/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'purchase',
          itemId: item.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        sounds.achievement();
        setToast({ message: `Purchased ${item.name}!`, type: 'success' });
        setShopData(prev => prev ? {
          ...prev,
          player_points: data.remaining_points,
        } : null);
        setSelectedItem(null);
      } else {
        sounds.error();
        setToast({ message: data.message || 'Purchase failed', type: 'error' });
      }
    } catch (error) {
      sounds.error();
      setToast({ message: 'Purchase failed', type: 'error' });
    } finally {
      setPurchasing(false);
    }
  };
  
  // Handle mystery box opening
  const handleMysteryBox = async (boxId: string, cost: number) => {
    if (!shopData || shopData.player_points < cost) {
      sounds.error();
      setToast({ message: 'Not enough points!', type: 'error' });
      return;
    }
    
    setPurchasing(true);
    sounds.purchase();
    
    try {
      const response = await fetch('/api/buddy-battle/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'mystery_box',
          boxId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Dramatic reveal sound
        sounds.achievement();
        setMysteryResult(data.result);
        setShopData(prev => prev ? {
          ...prev,
          player_points: data.remaining_points,
        } : null);
      } else {
        sounds.error();
        setToast({ message: data.message || 'Failed to open box', type: 'error' });
      }
    } catch (error) {
      sounds.error();
      setToast({ message: 'Failed to open box', type: 'error' });
    } finally {
      setPurchasing(false);
    }
  };
  
  // Initialize audio on interaction
  const handleInteraction = () => {
    if (!isInitialized) initAudio();
  };
  
  // Get rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#ffd700';
      case 'epic': return '#a855f7';
      case 'rare': return '#3b82f6';
      case 'uncommon': return '#22c55e';
      default: return '#9ca3af';
    }
  };
  
  if (loading) {
    return (
      <div 
        className="buddy-battle-container flex items-center justify-center min-h-screen"
        onClick={handleInteraction}
      >
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading shop...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="buddy-battle-container min-h-screen p-4"
      onClick={handleInteraction}
    >
      <div className="scanlines" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="retro-title">Buddy Shop</h1>
            <p className="retro-text text-xs text-retro-yellow">
              Refreshes in: {shopData?.refresh_countdown || 'Unknown'}
            </p>
          </div>
          
          <div className="retro-panel py-2 px-4">
            <p className="retro-text text-xs">Your Points</p>
            <p className="retro-text-lg text-retro-lime">
              {shopData?.player_points || 0} ✨
            </p>
          </div>
        </div>
        
        {/* Back button */}
        <RetroButton 
          onClick={() => router.push(`/team/${teamId}/buddy`)}
          variant="default"
          size="small"
          className="mb-4"
        >
          ← Back
        </RetroButton>
        
        {/* Tabs */}
        <RetroTabs 
          tabs={[
            { id: 'items', label: 'Items' },
            { id: 'mystery', label: 'Mystery Boxes' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Weekly Items */}
        {activeTab === 'items' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {shopData?.weekly_items.map(item => (
              <div 
                key={item.id}
                className="retro-panel p-4 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  sounds.select();
                  setSelectedItem(item);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="retro-text-lg">{item.name}</p>
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: getRarityColor(item.rarity), color: '#000' }}
                    >
                      {item.rarity.toUpperCase()}
                    </span>
                  </div>
                  <p className="retro-text text-retro-lime">
                    {item.price} ✨
                  </p>
                </div>
                
                <p className="retro-text text-xs text-retro-gray mb-3">
                  {item.description}
                </p>
                
                {/* Item icon placeholder */}
                <div 
                  className="w-16 h-16 mx-auto mb-2 flex items-center justify-center rounded"
                  style={{ 
                    backgroundColor: getRarityColor(item.rarity),
                    opacity: 0.8,
                  }}
                >
                  <span className="text-3xl">
                    {item.item_type === 'equipment' && '💎'}
                    {item.item_type === 'consumable' && '🧪'}
                    {item.item_type === 'cosmetic' && '🎨'}
                    {item.item_type === 'special' && '⚡'}
                  </span>
                </div>
                
                {/* Stats if applicable */}
                {item.stat_modifier && (
                  <div className="text-center">
                    <span className="retro-text text-xs text-retro-blue">
                      +{item.stat_modifier.amount} {item.stat_modifier.stat}
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {(!shopData?.weekly_items || shopData.weekly_items.length === 0) && (
              <div className="retro-panel p-8 col-span-2 text-center">
                <p className="retro-text text-retro-gray">
                  No items available right now. Check back later!
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Mystery Boxes */}
        {activeTab === 'mystery' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Bronze Box */}
            <div className="retro-panel p-4 text-center">
              <div className="text-6xl mb-2">📦</div>
              <p className="retro-text-lg" style={{ color: '#cd7f32' }}>Bronze Box</p>
              <p className="retro-text text-xs text-retro-gray mb-4">
                Common items, small boost
              </p>
              <p className="retro-text text-retro-lime mb-4">25 ✨</p>
              <RetroButton 
                onClick={() => handleMysteryBox('bronze', 25)}
                disabled={purchasing || (shopData?.player_points || 0) < 25}
                size="small"
              >
                Open
              </RetroButton>
            </div>
            
            {/* Silver Box */}
            <div className="retro-panel p-4 text-center">
              <div className="text-6xl mb-2">🎁</div>
              <p className="retro-text-lg" style={{ color: '#c0c0c0' }}>Silver Box</p>
              <p className="retro-text text-xs text-retro-gray mb-4">
                Rare items possible
              </p>
              <p className="retro-text text-retro-lime mb-4">75 ✨</p>
              <RetroButton 
                onClick={() => handleMysteryBox('silver', 75)}
                disabled={purchasing || (shopData?.player_points || 0) < 75}
                size="small"
              >
                Open
              </RetroButton>
            </div>
            
            {/* Gold Box */}
            <div className="retro-panel p-4 text-center">
              <div className="text-6xl mb-2">💰</div>
              <p className="retro-text-lg" style={{ color: '#ffd700' }}>Gold Box</p>
              <p className="retro-text text-xs text-retro-gray mb-4">
                Epic/Legendary possible!
              </p>
              <p className="retro-text text-retro-lime mb-4">200 ✨</p>
              <RetroButton 
                onClick={() => handleMysteryBox('gold', 200)}
                disabled={purchasing || (shopData?.player_points || 0) < 200}
                size="small"
                variant="primary"
              >
                Open
              </RetroButton>
            </div>
          </div>
        )}
      </div>
      
      {/* Item detail dialog */}
      {selectedItem && (
        <RetroDialog 
          title={selectedItem.name}
          onClose={() => setSelectedItem(null)}
        >
          <div className="text-center">
            <div 
              className="w-24 h-24 mx-auto mb-4 flex items-center justify-center rounded"
              style={{ backgroundColor: getRarityColor(selectedItem.rarity) }}
            >
              <span className="text-5xl">
                {selectedItem.item_type === 'equipment' && '💎'}
                {selectedItem.item_type === 'consumable' && '🧪'}
                {selectedItem.item_type === 'cosmetic' && '🎨'}
                {selectedItem.item_type === 'special' && '⚡'}
              </span>
            </div>
            
            <RetroBadge variant={selectedItem.rarity}>
              {selectedItem.rarity.toUpperCase()}
            </RetroBadge>
            
            <p className="retro-text my-4">{selectedItem.description}</p>
            
            {selectedItem.stat_modifier && (
              <div className="retro-panel py-2 px-4 mb-4">
                <p className="retro-text text-xs text-retro-blue">
                  Stat Bonus: +{selectedItem.stat_modifier.amount} {selectedItem.stat_modifier.stat}
                </p>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <p className="retro-text-lg text-retro-lime">
                {selectedItem.price} ✨
              </p>
              
              <RetroButton 
                onClick={() => handlePurchase(selectedItem)}
                disabled={purchasing || (shopData?.player_points || 0) < selectedItem.price}
                variant="primary"
              >
                {purchasing ? 'Buying...' : 'Buy Now'}
              </RetroButton>
            </div>
          </div>
        </RetroDialog>
      )}
      
      {/* Mystery box result dialog */}
      {mysteryResult && (
        <RetroDialog
          title="You got..."
          onClose={() => setMysteryResult(null)}
        >
          <div className="text-center">
            <div className="mystery-reveal mb-4">
              <div
                className="w-24 h-24 mx-auto flex items-center justify-center rounded animate-bounce"
                style={{ backgroundColor: getRarityColor(mysteryResult.rarity || 'common') }}
              >
                <span className="text-5xl">
                  {mysteryResult.is_jackpot ? '🎰' : '🎁'}
                </span>
              </div>
            </div>

            <p className="retro-text-lg mb-2">{mysteryResult.message || mysteryResult.name || 'Mystery Box'}</p>

            {mysteryResult.rarity && (
              <RetroBadge variant={(mysteryResult.rarity as any) ?? 'common'}>
                {mysteryResult.rarity.toUpperCase()}
              </RetroBadge>
            )}

            {mysteryResult.items_received?.length > 0 && (
              <div className="mt-4">
                {mysteryResult.items_received.map((it, idx) => (
                  <p key={idx} className="retro-text text-sm text-retro-lime">+ {it.name}</p>
                ))}
              </div>
            )}

            {mysteryResult.is_duplicate && (
              <p className="retro-text text-xs text-retro-yellow mt-2">
                Duplicate! Converted to {mysteryResult.refund_points} points
              </p>
            )}

            <RetroButton
              onClick={() => setMysteryResult(null)}
              variant="primary"
              className="mt-6"
            >
              Awesome!
            </RetroButton>
          </div>
        </RetroDialog>
      )}
      
      {/* Toast */}
      {toast && (
        <RetroToast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
