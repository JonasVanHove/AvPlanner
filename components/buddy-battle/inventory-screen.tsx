'use client';

// =====================================================
// BUDDY BATTLE - Inventory Component
// Player's items and equipment management
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroDialog, RetroTabs, RetroToast, RetroBadge } from './ui/retro-button';
import type { BuddyItem, PlayerBuddy } from '@/lib/buddy-battle/types';

// Helper function to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
  };
}

interface InventoryData {
  items: BuddyItem[];
  equipped: {
    held_item: BuddyItem | null;
    cosmetic: BuddyItem | null;
  };
  buddy: PlayerBuddy;
}

export function InventoryScreen() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.slug as string;
  
  const { sounds, initAudio, isInitialized } = useRetroSounds();
  
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<BuddyItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Fetch inventory
  useEffect(() => {
    async function fetchInventory() {
      if (!teamId) return;
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/buddy-battle/inventory?teamId=${teamId}`, { 
          credentials: 'include',
          headers,
        });
        const data = await response.json();
        setInventory(data);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchInventory();
  }, [teamId]);
  
  // Handle equip/unequip
  const handleEquip = async (item: BuddyItem) => {
    if (!inventory) return;
    
    sounds.select();
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/buddy-battle/inventory?teamId=${teamId}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          action: 'equip',
          itemId: item.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        sounds.achievement();
        setToast({ message: `Equipped ${item.name}!`, type: 'success' });
        setInventory(data.inventory);
        setSelectedItem(null);
      } else {
        sounds.error();
        setToast({ message: data.message || 'Failed to equip', type: 'error' });
      }
    } catch (error) {
      sounds.error();
      setToast({ message: 'Failed to equip item', type: 'error' });
    }
  };
  
  // Handle use consumable
  const handleUse = async (item: BuddyItem) => {
    if (item.item_type !== 'consumable') return;
    
    sounds.select();
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/buddy-battle/inventory?teamId=${teamId}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          action: 'use',
          itemId: item.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        sounds.achievement();
        setToast({ message: data.message || `Used ${item.name}!`, type: 'success' });
        setInventory(data.inventory);
        setSelectedItem(null);
      } else {
        sounds.error();
        setToast({ message: data.message || 'Failed to use item', type: 'error' });
      }
    } catch (error) {
      sounds.error();
      setToast({ message: 'Failed to use item', type: 'error' });
    }
  };
  
  // Filter items by tab
  const filteredItems = inventory?.items.filter(item => {
    if (activeTab === 'all') return true;
    return item.item_type === activeTab;
  }) || [];
  
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
  
  // Get item icon
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'held': return '💎';
      case 'consumable': return '🧪';
      case 'cosmetic': return '🎨';
      case 'boost': return '⚡';
      default: return '📦';
    }
  };
  
  // Initialize audio
  const handleInteraction = () => {
    if (!isInitialized) initAudio();
  };
  
  if (loading) {
    return (
      <div 
        className="buddy-battle-container flex items-center justify-center min-h-screen"
        onClick={handleInteraction}
      >
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading inventory...</p>
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
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="retro-title">Inventory</h1>
          <p className="retro-text text-xs text-retro-gray">
            {filteredItems.length} items
          </p>
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
        
        {/* Currently equipped */}
        <div className="retro-panel mb-4 p-4">
          <p className="retro-text text-xs text-retro-lime mb-3">Currently Equipped</p>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Held item slot */}
            <div 
              className="retro-panel p-3 text-center cursor-pointer hover:opacity-90"
              onClick={() => inventory?.equipped.held_item && setSelectedItem(inventory.equipped.held_item)}
            >
              <p className="retro-text text-xs text-retro-gray mb-2">Held Item</p>
              {inventory?.equipped.held_item ? (
                <>
                  <span className="text-3xl">{getItemIcon(inventory.equipped.held_item.item_type)}</span>
                  <p className="retro-text text-xs mt-1">{inventory.equipped.held_item.name}</p>
                </>
              ) : (
                <span className="text-3xl opacity-30">➖</span>
              )}
            </div>
            
            {/* Cosmetic slot */}
            <div 
              className="retro-panel p-3 text-center cursor-pointer hover:opacity-90"
              onClick={() => inventory?.equipped.cosmetic && setSelectedItem(inventory.equipped.cosmetic)}
            >
              <p className="retro-text text-xs text-retro-gray mb-2">Cosmetic</p>
              {inventory?.equipped.cosmetic ? (
                <>
                  <span className="text-3xl">🎨</span>
                  <p className="retro-text text-xs mt-1">{inventory.equipped.cosmetic.name}</p>
                </>
              ) : (
                <span className="text-3xl opacity-30">➖</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <RetroTabs 
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'held', label: 'Held' },
            { id: 'consumable', label: 'Consumable' },
            { id: 'cosmetic', label: 'Cosmetic' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Item grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mt-4">
          {filteredItems.map(item => {
            const isEquipped = 
              inventory?.equipped.held_item?.id === item.id ||
              inventory?.equipped.cosmetic?.id === item.id;
            
            return (
              <div 
                key={item.id}
                className={`retro-panel p-2 cursor-pointer hover:opacity-90 transition-opacity ${
                  isEquipped ? 'border-retro-lime border-2' : ''
                }`}
                onClick={() => {
                  sounds.select();
                  setSelectedItem(item);
                }}
              >
                <div 
                  className="w-full aspect-square flex items-center justify-center rounded mb-1"
                  style={{ 
                    backgroundColor: getRarityColor(item.rarity),
                    opacity: 0.8,
                  }}
                >
                  <span className="text-2xl">{getItemIcon(item.item_type)}</span>
                </div>
                <p className="retro-text text-xxs text-center truncate">
                  {item.name}
                </p>
                {(item.quantity ?? 1) > 1 && (
                  <p className="retro-text text-xxs text-center text-retro-gray">
                    x{item.quantity}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        
        {filteredItems.length === 0 && (
          <div className="retro-panel p-8 mt-4 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="retro-text text-retro-gray">
              No items in this category
            </p>
            <RetroButton 
              onClick={() => router.push(`/team/${teamId}/buddy/shop`)}
              variant="primary"
              size="small"
              className="mt-4"
            >
              Visit Shop
            </RetroButton>
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
              <span className="text-5xl">{getItemIcon(selectedItem.item_type)}</span>
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
            
            <div className="flex justify-center gap-3 mt-4">
              {selectedItem.item_type === 'equipment' && (
                <RetroButton 
                  onClick={() => handleEquip(selectedItem)}
                  variant="primary"
                >
                  {inventory?.equipped.held_item?.id === selectedItem.id ? 'Unequip' : 'Equip'}
                </RetroButton>
              )}
              
              {selectedItem.item_type === 'cosmetic' && (
                <RetroButton 
                  onClick={() => handleEquip(selectedItem)}
                  variant="primary"
                >
                  {inventory?.equipped.cosmetic?.id === selectedItem.id ? 'Unequip' : 'Equip'}
                </RetroButton>
              )}
              
              {selectedItem.item_type === 'consumable' && (
                <RetroButton 
                  onClick={() => handleUse(selectedItem)}
                  variant="primary"
                >
                  Use
                </RetroButton>
              )}
              
              <RetroButton 
                onClick={() => setSelectedItem(null)}
                variant="default"
              >
                Close
              </RetroButton>
            </div>
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
