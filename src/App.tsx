import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, update, remove } from 'firebase/database';
import { Plus, Printer, Check, ClipboardList, ChefHat, Trash2, X } from 'lucide-react';

// Tu configuración segura de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCpscFLv3JoF6aaiZ431oabdayc_97MKfE",
  authDomain: "app-langos.firebaseapp.com",
  databaseURL: "https://app-langos-default-rtdb.firebaseio.com",
  projectId: "app-langos",
  storageBucket: "app-langos.firebasestorage.app",
  messagingSenderId: "931389132865",
  appId: "1:931389132865:web:6e7bdf16983aae978c36c0",
  measurementId: "G-D6WC029HEW"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

type View = 'caja' | 'cocina';
type CheckField = 'checkMesero' | 'checkCocina';
type MenuCategory = 'Entradas' | 'Cocteles' | 'Ceviche' | 'Aguachile' | 'Camarones' | 'Filetes' | 'Mojarras' | 'Caldos' | 'Pulpo' | 'Infantil';

interface Item {
  name: string;
  variant?: string | null;
  price: number;
  cantidad: number;
  completado?: boolean;
  checkMesero?: boolean;
  checkCocina?: boolean;
}

interface Mesa {
  id: string;
  nombre: string;
  items?: Record<string, Item>;
  timestamp?: number;
}

type Dish =
  | { id: string; name: string; price: number; sizes?: never; isMarketPrice?: false }
  | { id: string; name: string; sizes: Record<string, number>; price?: never; isMarketPrice?: false }
  | { id: string; name: string; isMarketPrice: true; price?: never; sizes?: never };

// TU MENÚ COMPLETO Y REAL
const MENU: Record<MenuCategory, Dish[]> = {
  Entradas: [
    { id: 'e1', name: 'Consomé', price: 30 },
    { id: 'e2', name: 'Quesadilla de Cazón', price: 60 },
    { id: 'e3', name: 'Quesadilla de Camarón', price: 75 },
    { id: 'e4', name: 'Empanada de Camarón', price: 65 },
    { id: 'e5', name: 'Tostada de Camarón', price: 70 },
    { id: 'e6', name: 'Tostada de Pulpo', price: 65 }
  ],
  Cocteles: [
    { id: 'c1', name: 'Cóctel de Camarón', sizes: { Chico: 70, Mediano: 100, Grande: 165 } },
    { id: 'c2', name: 'Vuelve a la vida', sizes: { Chico: 75, Mediano: 110, Grande: 175 } }
  ],
  Ceviche: [
    { id: 'ce1', name: 'Ceviche de Camarón', price: 220 },
    { id: 'ce2', name: 'Ceviche de Pescado', price: 100 },
    { id: 'ce3', name: 'Tropical Langostinos', price: 230 }
  ],
  Aguachile: [
    { id: 'ag1', name: 'Aguachile Normal', price: 230 },
    { id: 'ag2', name: 'Aguachile Mango Habanero', price: 240 }
  ],
  Camarones: [
    { id: 'cam1', name: 'Camarones Fritos', price: 170 },
    { id: 'cam2', name: 'Camarones al Mojo de ajo', price: 170 },
    { id: 'cam3', name: 'Camarones a la Diabla', price: 170 },
    { id: 'cam4', name: 'Camarones Empanizados', price: 170 },
    { id: 'cam5', name: 'Camarones Empanizados Rellenos', price: 170 }
  ],
  Filetes: [
    { id: 'f1', name: 'Filete a la Plancha', price: 130 },
    { id: 'f2', name: 'Filete al Mojo de ajo', price: 140 },
    { id: 'f3', name: 'Filete al Ajillo', price: 140 },
    { id: 'f4', name: 'Filete Empanizado', price: 140 },
    { id: 'f5', name: 'Filete a la Diabla', price: 140 },
    { id: 'f6', name: 'Filete Empapelado', price: 140 },
    { id: 'f7', name: 'Filete Relleno Empapelado', price: 180 },
    { id: 'f8', name: 'Filete Relleno Empanizado', price: 180 }
  ],
  Mojarras: [
    { id: 'm1', name: 'Mojarra Frita', isMarketPrice: true },
    { id: 'm2', name: 'Mojarra al Mojo', isMarketPrice: true },
    { id: 'm3', name: 'Mojarra a la Diabla', isMarketPrice: true },
    { id: 'm4', name: 'Mojarra al Ajillo', isMarketPrice: true },
    { id: 'm5', name: 'Mojarra Rellena', isMarketPrice: true },
    { id: 'm6', name: 'Mojarra Embarazada', isMarketPrice: true }
  ],
  Caldos: [
    { id: 'cal1', name: 'Caldo de Camarón', price: 150 },
    { id: 'cal2', name: 'Caldo de Jaiba', price: 140 },
    { id: 'cal3', name: 'Caldo de Almeja', price: 130 },
    { id: 'cal4', name: 'Cazuela de Mariscos', price: 170 }
  ],
  Pulpo: [
    { id: 'p1', name: 'Pulpo Enamorado', price: 160 },
    { id: 'p2', name: 'Pulpo al Ajillo', price: 160 },
    { id: 'p3', name: 'Pulpo al Mojo de ajo', price: 160 },
    { id: 'p4', name: 'Pulpo a la Diabla', price: 160 }
  ],
  Infantil: [
    { id: 'i1', name: 'Nuggets de Pollo', price: 80 }
  ]
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>('caja');
  const [mesas, setMesas] = useState<Record<string, Mesa>>({});
  const [selectedMesaId, setSelectedMesaId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MenuCategory>('Entradas');
  const [nuevaMesaNombre, setNuevaMesaNombre] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    const mesasRef = ref(db, 'mesas');
    const unsubscribe = onValue(mesasRef, (snapshot) => {
      const data = snapshot.val() as Record<string, Mesa> | null;
      setMesas(data || {});
    });
    return () => unsubscribe();
  }, []);

  const handleCrearMesa = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nuevaMesaNombre.trim()) return;
    const mesasRef = ref(db, 'mesas');
    const newMesaRef = push(mesasRef);
    const newMesaId = newMesaRef.key;
    if (!newMesaId) return;

    set(newMesaRef, {
      id: newMesaId,
      nombre: nuevaMesaNombre.trim(),
      items: {},
      timestamp: Date.now()
    });
    setSelectedMesaId(newMesaId);
    setNuevaMesaNombre('');
  };

  const handleAgregarItem = (name: string, variant: string | null, price: number) => {
    if (!selectedMesaId) return;
    
    const itemKey = `${name}-${variant || 'unico'}`.replace(/[^a-zA-Z0-9-]/g, '_');
    const itemRef = ref(db, `mesas/${selectedMesaId}/items/${itemKey}`);
    const existingItem = mesas[selectedMesaId]?.items?.[itemKey];

    if (existingItem) {
      if (existingItem.checkCocina && existingItem.checkMesero) {
        set(itemRef, {
          name,
          variant: variant || null,
          price,
          cantidad: 1,
          checkCocina: false,
          checkMesero: false,
          completado: false
        });
      } else {
        update(itemRef, { 
          cantidad: existingItem.cantidad + 1,
          completado: false 
        });
      }
    } else {
      set(itemRef, {
        name,
        variant: variant || null,
        price,
        cantidad: 1,
        checkCocina: false,
        checkMesero: false,
        completado: false
      });
    }
  };

  const handleToggleCheck = (mesaId: string, itemKey: string, field: CheckField) => {
    const itemRef = ref(db, `mesas/${mesaId}/items/${itemKey}`);
    const item = mesas[mesaId]?.items?.[itemKey];
    if (!item) return;

    const currentValue = item[field] || false;
    
    const updates: Partial<Item> = { [field]: !currentValue };
    
    const willCheckCocina = field === 'checkCocina' ? !currentValue : item.checkCocina;
    const willCheckMesero = field === 'checkMesero' ? !currentValue : item.checkMesero;

    if (willCheckCocina && willCheckMesero) {
      updates.completado = true;
    } else {
      updates.completado = false;
    }

    update(itemRef, updates);
  };

  const handleEliminarMesa = (mesaId: string) => {
    if (window.confirm('¿Desea cerrar y archivar esta mesa?')) {
      remove(ref(db, `mesas/${mesaId}`));
      if (selectedMesaId === mesaId) setSelectedMesaId(null);
    }
  };

  const handleEliminarItem = (mesaId: string, itemKey: string) => {
    remove(ref(db, `mesas/${mesaId}/items/${itemKey}`));
  };

  const calcularTotalMesa = (mesa: Mesa): number => {
    if (!mesa?.items) return 0;
    return Object.values(mesa.items).reduce((sum, item) => sum + (item.price * item.cantidad), 0);
  };

  const mesasActivasCocina = Object.values(mesas).filter(mesa => 
    mesa.items && Object.values(mesa.items).some(item => !item.completado)
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ticket-print-area, #ticket-print-area * { visibility: visible !important; }
          #ticket-print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 80mm; 
            padding: 0;
            margin: 0;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
        /* Ocultar barra de scroll pero permitir deslizamiento */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <nav className="bg-blue-600 text-white shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="font-bold text-xl tracking-wide flex items-center gap-2">
            <span>⚓</span>
            <span>Marisquería Realtime POS</span>
          </div>
          <div className="flex bg-blue-700 p-1 rounded-lg overflow-hidden">
            <button 
              onClick={() => setCurrentView('caja')}
              className={`flex items-center space-x-2 px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-all ${currentView === 'caja' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:bg-blue-600'}`}
            >
              <ClipboardList size={18} />
              <span className="hidden sm:inline">💻 Vista Caja</span>
              <span className="sm:hidden">Caja</span>
            </button>
            <button 
              onClick={() => setCurrentView('cocina')}
              className={`flex items-center space-x-2 px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-all ${currentView === 'cocina' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:bg-blue-600'}`}
            >
              <ChefHat size={18} />
              <span className="hidden sm:inline">🍳 Vista Cocina</span>
              <span className="sm:hidden">Cocina</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6 no-print">
        {currentView === 'caja' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <form onSubmit={handleCrearMesa} className="flex gap-3 mb-4">
                  <input 
                    type="text" 
                    placeholder="Nombre de la Mesa (Ej: Mesa 1, Barra)" 
                    value={nuevaMesaNombre}
                    onChange={(e) => setNuevaMesaNombre(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium"
                  />
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                    <Plus size={20} />
                    <span className="hidden sm:inline">+ Crear Mesa</span>
                    <span className="sm:hidden">Crear</span>
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {Object.values(mesas).map((mesa) => (
                    <button
                      key={mesa.id}
                      onClick={() => setSelectedMesaId(mesa.id)}
                      className={`px-5 py-3 rounded-lg font-bold text-sm border transition-all ${selectedMesaId === mesa.id ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {mesa.nombre}
                    </button>
                  ))}
                  {Object.keys(mesas).length === 0 && (
                    <span className="text-slate-400 text-sm italic py-2">No hay mesas activas. Crea una para empezar.</span>
                  )}
                </div>
              </div>

              {selectedMesaId ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  
                  {/* Menú desplazable para que quepan todas tus categorías */}
                  <div className="flex bg-slate-100 border-b border-slate-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
                    {(Object.keys(MENU) as MenuCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`px-6 py-4 text-center font-bold text-base border-b-2 transition-colors flex-shrink-0 ${activeTab === cat ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                      >
                        {cat === 'Cocteles' ? 'Cócteles' : cat}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {MENU[activeTab]?.map((dish) => (
                        <div key={dish.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between space-y-3">
                          <span className="font-bold text-lg text-slate-900 leading-tight">{dish.name}</span>
                          
                          {dish.sizes ? (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {Object.entries(dish.sizes).map(([size, price]) => (
                                <button
                                  key={size}
                                  onClick={() => handleAgregarItem(dish.name, size, price)}
                                  className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold py-2 px-1 rounded-lg text-xs flex flex-col items-center transition-colors shadow-sm active:scale-95"
                                >
                                  <span className="text-slate-500 uppercase font-medium">{size}</span>
                                  <span className="text-sm">${price}</span>
                                </button>
                              ))}
                            </div>
                          ) : dish.isMarketPrice ? (
                            <button
                              onClick={() => {
                                const precio = window.prompt(`Ingresa el precio de la ${dish.name} según el peso ($):`);
                                if (precio && !Number.isNaN(Number(precio)) && Number(precio) > 0) {
                                  // Genera una variante con el precio para que no se revuelvan si piden 2 mojarras de distinto precio
                                  handleAgregarItem(dish.name, `Precio: $${precio}`, Number(precio));
                                } else if (precio !== null) {
                                  alert('Por favor ingresa un precio válido con números.');
                                }
                              }}
                              className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm active:scale-95"
                            >
                              Agregar (Pedir Precio)
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAgregarItem(dish.name, null, dish.price)}
                              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm active:scale-95"
                            >
                              Agregar (${dish.price})
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500 font-medium">
                  Selecciona o crea una mesa para ver el menú y tomar la orden.
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-6 flex flex-col max-h-[calc(100vh-120px)]">
                {selectedMesaId && mesas[selectedMesaId] ? (
                  <>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                      <div>
                        <h2 className="font-black text-xl text-slate-900">{mesas[selectedMesaId].nombre}</h2>
                        <span className="text-xs font-semibold text-slate-400">Resumen de cuenta</span>
                      </div>
                      <button 
                        onClick={() => handleEliminarMesa(selectedMesaId)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                        title="Cerrar y eliminar mesa"
                      >
                        <Trash2 size={16} />
                        <span>Cerrar</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2 hide-scrollbar">
                      {mesas[selectedMesaId].items ? (
                        Object.entries(mesas[selectedMesaId].items).map(([key, item]) => (
                          <div 
                            key={key} 
                            className={`p-3 border rounded-xl flex items-center justify-between transition-colors ${item.completado ? 'bg-emerald-50 border-emerald-300 opacity-60' : 'bg-slate-50 border-slate-200'}`}
                          >
                            <div className="flex-1 pr-2">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{item.cantidad}x</span>
                                <span className={item.completado ? 'line-through' : ''}>{item.name}</span>
                              </div>
                              {item.variant && (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 rounded-md text-slate-600 inline-block mt-1">
                                  {item.variant}
                                </span>
                              )}
                              <div className="text-xs font-bold text-slate-500 mt-1">
                                Subtotal: ${item.price * item.cantidad}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-slate-400 font-extrabold mb-1">MESERO</span>
                                <button
                                  onClick={() => handleToggleCheck(selectedMesaId, key, 'checkMesero')}
                                  className={`w-7 h-7 border-2 rounded cursor-pointer flex items-center justify-center transition-all ${item.checkMesero ? 'bg-green-600 border-green-600 text-white' : 'border-slate-300 bg-white hover:border-slate-400'}`}
                                >
                                  {item.checkMesero && <Check size={16} strokeWidth={3.5} className="text-white" />}
                                </button>
                              </div>
                              <button 
                                onClick={() => handleEliminarItem(selectedMesaId, key)}
                                className="text-slate-400 hover:text-red-500 p-1"
                                title="Eliminar platillo"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-400 py-12 text-sm italic font-medium">
                          No hay platillos agregados a esta cuenta.
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-4 mt-auto space-y-3">
                      <div className="flex justify-between items-center text-xl font-black text-slate-900 px-1">
                        <span>Total:</span>
                        <span className="text-blue-600">${calcularTotalMesa(mesas[selectedMesaId])}</span>
                      </div>
                      <button
                        onClick={() => setShowTicketModal(true)}
                        disabled={!mesas[selectedMesaId].items}
                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-98"
                      >
                        <Printer size={20} />
                        <span>🖨️ Imprimir Cuenta</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 py-16 font-medium">
                    Ninguna mesa seleccionada
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mesasActivasCocina.length > 0 ? (
              mesasActivasCocina.map((mesa) => (
                <div key={mesa.id} className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="border-b-2 border-slate-100 pb-3 mb-4 flex justify-between items-center">
                      <h3 className="font-black text-2xl text-blue-700">{mesa.nombre}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
                        En preparación
                      </span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(mesa.items ?? {})
                        .filter(([, item]) => !item.completado)
                        .map(([key, item]) => (
                          <div 
                            key={key} 
                            className={`p-3.5 border-2 rounded-xl flex items-center justify-between transition-colors ${item.checkCocina ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-100'}`}
                          >
                            <div className="flex-1 pr-3">
                              <div className="font-black text-xl text-slate-900 leading-snug">
                                {item.cantidad}x {item.name}
                              </div>
                              {item.variant && (
                                <span className="inline-block mt-1 text-xs font-extrabold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                  {item.variant}
                                </span>
                              )}
                              {item.checkMesero && (
                                <div className="mt-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                                  ✓ Entregado en mesa
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-center pl-2">
                              <span className="text-[10px] text-slate-400 font-extrabold mb-1">COCINA</span>
                              <button
                                onClick={() => handleToggleCheck(mesa.id, key, 'checkCocina')}
                                className={`w-7 h-7 border-2 rounded cursor-pointer flex items-center justify-center transition-all ${item.checkCocina ? 'bg-green-600 border-green-600 text-white' : 'border-slate-300 bg-white hover:border-slate-400'}`}
                              >
                                {item.checkCocina && <Check size={16} strokeWidth={3.5} className="text-white" />}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center text-slate-400">
                <ChefHat size={48} className="mx-auto mb-3 opacity-40" />
                <div className="text-xl font-bold text-slate-500">🍳 ¡Todo limpio y listo!</div>
                <div className="text-sm font-medium mt-1">No hay platillos pendientes en cocina.</div>
              </div>
            )}
          </div>
        )}
      </main>

      {showTicketModal && selectedMesaId && mesas[selectedMesaId] && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 no-print backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-700 flex items-center gap-2">
                <Printer size={18} />
                <span>Vista Previa del Recibo</span>
              </span>
              <button 
                onClick={() => setShowTicketModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-200/50 flex justify-center">
              <div 
                id="ticket-print-area" 
                className="bg-white p-4 shadow-md border border-slate-300 w-[80mm] text-black font-mono text-xs leading-tight"
              >
                <div className="text-center font-bold text-sm uppercase tracking-wider mb-1">⚓ MARISQUERÍA MAR DE ENGAÑO ⚓</div>
                <div className="text-center text-[10px] text-slate-600 mb-3">SABORES FRESCOS EN TIEMPO REAL</div>
                <div className="border-b border-dashed border-black pb-2 mb-2 text-[11px]">
                  <div>FECHA: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  <div className="font-bold mt-0.5">MESA: {mesas[selectedMesaId].nombre}</div>
                </div>

                <table className="w-full text-left mb-3">
                  <thead>
                    <tr className="border-b border-dashed border-black text-[11px]">
                      <th className="pb-1 font-bold">CANT/PROD</th>
                      <th className="pb-1 text-right font-bold">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesas[selectedMesaId].items && Object.values(mesas[selectedMesaId].items).map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-1">
                          <div className="font-semibold">{item.cantidad} x {item.name}</div>
                          {item.variant && <span className="text-[10px] text-slate-600 pl-2">({item.variant})</span>}
                        </td>
                        <td className="py-1 text-right font-semibold">${item.price * item.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-black pt-2 flex justify-between items-center text-sm font-bold">
                  <span>TOTAL A PAGAR:</span>
                  <span>${calcularTotalMesa(mesas[selectedMesaId])}</span>
                </div>
                
                <div className="text-center mt-6 pt-3 border-t border-dashed border-black text-[10px] text-slate-600">
                  ¡GRACIAS POR SU PREFERENCIA!
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowTicketModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => { window.print(); setShowTicketModal(false); }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={16} />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
