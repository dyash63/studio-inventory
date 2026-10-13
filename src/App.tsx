import { useState, useEffect, useCallback } from 'react';
import { 
  Package, Camera, Calendar, Dumbbell, Plus, Trash2, 
  Check, X, Home, Shirt, Utensils, MoreHorizontal,
  AlertCircle, RefreshCw, ChevronDown
} from 'lucide-react';
import { InventoryItem, ActivityType, PackingSuggestion, AIProposal, Category } from './types';
import { calculateSuggestions } from './lib/packingRules';
import { analyzeInventoryPhoto } from './lib/gemini';

// Local storage key for offline-first demo (Firebase can be wired later)
const STORAGE_KEY = 'studio-inventory-v1';

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  clothes: <Shirt className="w-4 h-4" />,
  kitchen: <Utensils className="w-4 h-4" />,
  misc: <MoreHorizontal className="w-4 h-4" />,
  activity: <Dumbbell className="w-4 h-4" />,
};

const ACTIVITY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'swimming', label: '🏊 Swimming' },
  { value: 'badminton', label: '🏸 Badminton' },
  { value: 'tennis', label: '🎾 Tennis' },
  { value: 'squash', label: 'Squash' },
  { value: 'running', label: '🏃 Running' },
  { value: 'gym', label: '💪 Gym' },
];

function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [days, setDays] = useState(2);
  const [activities, setActivities] = useState<ActivityType[]>(['none']);
  const [suggestions, setSuggestions] = useState<PackingSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'pack' | 'inventory' | 'photo'>('pack');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, category: 'clothes' as Category });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiProposals, setAiProposals] = useState<AIProposal[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedProposals, setSelectedProposals] = useState<Set<number>>(new Set());

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setInventory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  }, [inventory]);

  // Recalculate suggestions
  useEffect(() => {
    const invSimple = inventory.map(i => ({ name: i.name, quantity: i.quantity }));
    const acts = activities.includes('none') ? [] : activities;
    setSuggestions(calculateSuggestions(days, acts, invSimple));
  }, [days, activities, inventory]);

  const addItem = useCallback((name: string, quantity: number, category: Category) => {
    setInventory(prev => {
      const existing = prev.find(i => i.name.toLowerCase() === name.toLowerCase() && i.category === category);
      if (existing) {
        return prev.map(i =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + quantity, lastUpdated: Date.now() }
            : i
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name,
          quantity,
          category,
          lastUpdated: Date.now(),
        },
      ];
    });
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setInventory(prev =>
      prev
        .map(i => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta), lastUpdated: Date.now() } : i))
        .filter(i => i.quantity > 0)
    );
  };

  const deleteItem = (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setAnalyzing(true);
      setAiProposals([]);
      setSelectedProposals(new Set());

      try {
        const proposals = await analyzeInventoryPhoto(base64, file.type);
        setAiProposals(proposals);
        // Pre-select high confidence ones
        const highConf = new Set(proposals.map((p, idx) => (p.confidence > 0.7 ? idx : -1)).filter(i => i >= 0));
        setSelectedProposals(highConf);
      } catch (err) {
        console.error(err);
        alert('AI analysis failed. Check your Gemini key or try again.');
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const applySelectedProposals = () => {
    aiProposals.forEach((p, idx) => {
      if (selectedProposals.has(idx)) {
        addItem(p.name, p.quantity, p.category);
      }
    });
    setAiProposals([]);
    setPhotoPreview(null);
    setSelectedProposals(new Set());
    setActiveTab('inventory');
  };

  const toggleActivity = (act: ActivityType) => {
    if (act === 'none') {
      setActivities(['none']);
      return;
    }
    setActivities(prev => {
      const withoutNone = prev.filter(a => a !== 'none');
      if (withoutNone.includes(act)) {
        const next = withoutNone.filter(a => a !== act);
        return next.length === 0 ? ['none'] : next;
      }
      return [...withoutNone, act];
    });
  };

  const toBringCount = suggestions.filter(s => s.toBring > 0).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Studio Inventory</h1>
              <p className="text-xs text-slate-400">Godrej Ananda · Bangalore</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">{inventory.length}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">items</div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* ===== PACK TAB ===== */}
        {activeTab === 'pack' && (
          <>
            {/* Days selector */}
            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold">How many days?</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDays(d => Math.max(1, d - 1))}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-2xl font-bold active:scale-95 transition"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-4xl font-bold">{days}</div>
                  <div className="text-xs text-slate-400">day{days > 1 ? 's' : ''}</div>
                </div>
                <button
                  onClick={() => setDays(d => Math.min(14, d + 1))}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-2xl font-bold active:scale-95 transition"
                >
                  +
                </button>
              </div>
            </section>

            {/* Activities */}
            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold">Clubhouse / Activities</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleActivity(opt.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition active:scale-95 ${
                      activities.includes(opt.value)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-transparent'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Suggestions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  What to bring
                </h2>
                {toBringCount > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                    {toBringCount} items needed
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 border transition ${
                      s.toBring > 0
                        ? 'bg-slate-900 border-amber-500/30'
                        : 'bg-slate-900/50 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-400">{CATEGORY_ICONS[s.category]}</span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.itemName}</div>
                          <div className="text-xs text-slate-400">{s.reason}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {s.toBring > 0 ? (
                          <div className="text-lg font-bold text-amber-400">+{s.toBring}</div>
                        ) : (
                          <div className="text-sm text-emerald-400">✓</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ===== INVENTORY TAB ===== */}
        {activeTab === 'inventory' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Live Inventory</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95 transition"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No items yet.</p>
                <p className="text-sm mt-1">Add manually or snap a photo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(['clothes', 'kitchen', 'activity', 'misc'] as Category[]).map(cat => {
                  const items = inventory.filter(i => i.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-1.5 mt-4 first:mt-0">
                        {CATEGORY_ICONS[cat]} {cat}
                      </div>
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3 mb-2"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              Updated {new Date(item.lastUpdated).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-9 h-9 rounded-lg bg-slate-800 text-lg font-bold active:scale-95"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-9 h-9 rounded-lg bg-slate-800 text-lg font-bold active:scale-95"
                            >
                              +
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="w-9 h-9 rounded-lg bg-red-900/40 text-red-400 flex items-center justify-center active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== PHOTO TAB ===== */}
        {activeTab === 'photo' && (
          <>
            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold">Snap & Add to Inventory</h2>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Take a photo of your drawer, fridge, or shelf. AI will propose items — you approve before anything is added.
              </p>

              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500/50 transition bg-slate-900/50">
                <Camera className="w-10 h-10 text-slate-500 mb-2" />
                <span className="text-sm text-slate-400">Tap to take or upload photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </label>
            </section>

            {analyzing && (
              <div className="flex items-center justify-center gap-3 py-8 text-emerald-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>AI is looking at your photo…</span>
              </div>
            )}

            {photoPreview && !analyzing && (
              <div className="space-y-4">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full rounded-xl border border-slate-800 max-h-48 object-cover"
                />

                {aiProposals.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No relevant items detected.</p>
                    <p className="text-sm">Try a clearer photo or different angle.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">AI Proposals</h3>
                      <span className="text-xs text-slate-400">Tap to select/deselect</span>
                    </div>
                    <div className="space-y-2">
                      {aiProposals.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedProposals(prev => {
                              const next = new Set(prev);
                              if (next.has(idx)) next.delete(idx);
                              else next.add(idx);
                              return next;
                            });
                          }}
                          className={`w-full text-left rounded-xl p-3 border transition flex items-center justify-between ${
                            selectedProposals.has(idx)
                              ? 'bg-emerald-500/10 border-emerald-500/40'
                              : 'bg-slate-900 border-slate-800 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {CATEGORY_ICONS[p.category]}
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-slate-400">
                                ×{p.quantity} · {Math.round(p.confidence * 100)}% confident
                              </div>
                            </div>
                          </div>
                          {selectedProposals.has(idx) ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <div className="w-5 h-5 rounded border border-slate-600" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setAiProposals([]);
                          setPhotoPreview(null);
                        }}
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applySelectedProposals}
                        disabled={selectedProposals.size === 0}
                        className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-40 active:scale-95"
                      >
                        Add {selectedProposals.size} item{selectedProposals.size !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-5 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Item</h3>
              <button onClick={() => setShowAddForm(false)}>
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Item name (e.g. T-Shirt)"
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
            />
            <div className="flex gap-3">
              <input
                type="number"
                min={1}
                value={newItem.quantity}
                onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
              />
              <select
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value as Category })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
              >
                <option value="clothes">Clothes</option>
                <option value="kitchen">Kitchen</option>
                <option value="activity">Activity / Sports</option>
                <option value="misc">Misc</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (newItem.name.trim()) {
                  addItem(newItem.name.trim(), newItem.quantity, newItem.category);
                  setNewItem({ name: '', quantity: 1, category: 'clothes' });
                  setShowAddForm(false);
                }
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 font-medium active:scale-95"
            >
              Add to Inventory
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 z-40">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'pack' as const, icon: Package, label: 'Pack' },
            { id: 'inventory' as const, icon: Home, label: 'Inventory' },
            { id: 'photo' as const, icon: Camera, label: 'Photo AI' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                activeTab === tab.id ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <tab.icon className="w-6 h-6" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;
